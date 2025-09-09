const Issue = require('../models/Issue');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { z } = require('zod');

// Validation schemas
const createIssueSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  category: z.enum(['hardware', 'software', 'network', 'printer', 'email', 'access', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  requiredSkills: z.array(z.string().min(2)).min(1),
  location: z.object({
    building: z.string().optional(),
    floor: z.string().optional(),
    room: z.string().optional()
  }).optional(),
  tags: z.array(z.string()).optional(),
  estimatedTime: z.number().positive().optional()
});

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
const createIssue = asyncHandler(async (req, res) => {
  const validatedData = createIssueSchema.parse(req.body);

  const issue = await Issue.create({
    ...validatedData,
    postedBy: req.user._id,
    priority: validatedData.priority || 'medium'
  });

  // Populate user details
  await issue.populate('postedBy', 'firstName lastName employeeId department');

  res.status(201).json({
    success: true,
    data: issue
  });
});

// @desc    Get all issues with filtering
// @route   GET /api/issues
// @access  Private
const getIssues = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    priority,
    postedBy,
    assignedTo,
    excludePostedBy,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (postedBy) filter.postedBy = postedBy;
  if (assignedTo) filter.assignedTo = assignedTo;
  
  // Exclude current user's issues from "All Issues" page
  if (excludePostedBy) {
    filter.postedBy = { $ne: excludePostedBy };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const issues = await Issue.find(filter)
    .populate('postedBy', 'firstName lastName employeeId department')
    .populate('assignedTo', 'firstName lastName employeeId department')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Issue.countDocuments(filter);

  res.json({
    success: true,
    data: issues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private
const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('postedBy', 'firstName lastName employeeId department')
    .populate('assignedTo', 'firstName lastName employeeId department')
    .populate('comments.user', 'firstName lastName employeeId')
    .populate('resolution.resolvedBy', 'firstName lastName employeeId');

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  res.json({
    success: true,
    data: issue
  });
});

// @desc    Update issue
// @route   PUT /api/issues/:id
// @access  Private
const updateIssue = asyncHandler(async (req, res) => {
  let issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  // Check if user can update this issue
  if (issue.postedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this issue'
    });
  }

  // Only allow updates if issue is not resolved
  if (issue.status === 'resolved' || issue.status === 'closed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update resolved or closed issues'
    });
  }

  const allowedUpdates = ['title', 'description', 'priority', 'requiredSkills', 'location', 'tags', 'estimatedTime'];
  const updates = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  issue = await Issue.findByIdAndUpdate(req.params.id, updates, { new: true })
    .populate('postedBy', 'firstName lastName employeeId department')
    .populate('assignedTo', 'firstName lastName employeeId department');

  res.json({
    success: true,
    data: issue
  });
});

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private
const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  // Check if user can delete this issue
  if (issue.postedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this issue'
    });
  }

  await issue.deleteOne();

  res.json({
    success: true,
    message: 'Issue deleted successfully'
  });
});

// @desc    Get AI-powered helper suggestions
// @route   GET /api/issues/:id/helpers
// @access  Private
const getHelperSuggestions = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  // Find users with matching skills
  const potentialHelpers = await User.find({
    isActive: true,
    'skills.name': { $in: issue.requiredSkills.map(skill => new RegExp(skill, 'i')) }
  }).select('-password');

  // Calculate helper scores using AI algorithm
  const helpersWithScores = potentialHelpers.map(helper => {
    const score = helper.calculateHelperScore(issue.requiredSkills);
    return {
      ...helper.toObject(),
      helperScore: score
    };
  });

  // Sort by helper score (descending)
  helpersWithScores.sort((a, b) => b.helperScore - a.helperScore);

  // Return top 10 helpers
  const topHelpers = helpersWithScores.slice(0, 10);

  res.json({
    success: true,
    data: {
      issue: {
        id: issue._id,
        title: issue.title,
        requiredSkills: issue.requiredSkills
      },
      helpers: topHelpers
    }
  });
});

// @desc    Assign issue to helper
// @route   PUT /api/issues/:id/assign
// @access  Private
const assignIssue = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  if (!assignedTo) {
    return res.status(400).json({
      success: false,
      message: 'Helper ID is required'
    });
  }

  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  // Check if user can assign this issue
  if (issue.postedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to assign this issue'
    });
  }

  // Check if helper exists
  const helper = await User.findById(assignedTo);
  if (!helper) {
    return res.status(404).json({
      success: false,
      message: 'Helper not found'
    });
  }

  issue.assignedTo = assignedTo;
  issue.status = 'assigned';
  await issue.save();

  await issue.populate('assignedTo', 'firstName lastName employeeId department');

  res.json({
    success: true,
    data: issue
  });
});

// @desc    Add comment to issue
// @route   POST /api/issues/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
  const { content, isSolution = false } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }

  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  issue.addComment(req.user._id, content.trim(), isSolution);
  await issue.save();

  await issue.populate('comments.user', 'firstName lastName employeeId');

  res.json({
    success: true,
    data: issue.comments[issue.comments.length - 1]
  });
});

// @desc    Resolve issue
// @route   PUT /api/issues/:id/resolve
// @access  Private
const resolveIssue = asyncHandler(async (req, res) => {
  const { solution, timeSpent } = req.body;

  if (!solution) {
    return res.status(400).json({
      success: false,
      message: 'Solution is required'
    });
  }

  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  // Check if user can resolve this issue
  if (issue.assignedTo.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to resolve this issue'
    });
  }

  issue.resolve(req.user._id, solution, timeSpent);
  await issue.save();

  // Update helper's contribution stats
  const helper = await User.findById(req.user._id);
  helper.contributions.issuesResolved += 1;
  helper.contributions.totalTimeHelped += timeSpent || 0;
  await helper.save();

  await issue.populate('resolution.resolvedBy', 'firstName lastName employeeId');

  res.json({
    success: true,
    data: issue
  });
});

// @desc    Vote on issue
// @route   POST /api/issues/:id/vote
// @access  Private
const voteIssue = asyncHandler(async (req, res) => {
  const { voteType } = req.body; // 'upvote' or 'downvote'

  if (!['upvote', 'downvote'].includes(voteType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid vote type'
    });
  }

  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return res.status(404).json({
      success: false,
      message: 'Issue not found'
    });
  }

  let success = false;
  if (voteType === 'upvote') {
    success = issue.addUpvote(req.user._id);
  } else {
    success = issue.addDownvote(req.user._id);
  }

  if (!success) {
    return res.status(400).json({
      success: false,
      message: 'You have already voted on this issue'
    });
  }

  await issue.save();

  res.json({
    success: true,
    data: {
      voteCount: issue.voteCount,
      upvotes: issue.upvotes.length,
      downvotes: issue.downvotes.length
    }
  });
});

module.exports = {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  getHelperSuggestions,
  assignIssue,
  addComment,
  resolveIssue,
  voteIssue
}; 