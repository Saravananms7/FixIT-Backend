const User = require('../models/User');
const Issue = require('../models/Issue');
const { asyncHandler } = require('../middleware/errorHandler');
const { z } = require('zod');

// Validation schemas
const updateSkillsSchema = z.object({
  skills: z.array(z.object({
    name: z.string().min(2).max(50),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    verified: z.boolean().optional()
  }))
});

// @desc    Get all users with filtering
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const {
    department,
    skill,
    availability,
    page = 1,
    limit = 10,
    sortBy = 'firstName',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = { isActive: true };
  if (department) filter.department = new RegExp(department, 'i');
  if (availability) filter.availability = availability;
  if (skill) filter['skills.name'] = new RegExp(skill, 'i');

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Get user's issues
// @route   GET /api/users/:id/issues
// @access  Private
const getUserIssues = asyncHandler(async (req, res) => {
  const { type = 'posted', status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (type === 'posted') {
    filter.postedBy = req.params.id;
  } else if (type === 'assigned') {
    filter.assignedTo = req.params.id;
  } else if (type === 'resolved') {
    filter['resolution.resolvedBy'] = req.params.id;
  }

  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const issues = await Issue.find(filter)
    .populate('postedBy', 'firstName lastName employeeId department')
    .populate('assignedTo', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 })
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

// @desc    Update user skills
// @route   PUT /api/users/:id/skills
// @access  Private
const updateUserSkills = asyncHandler(async (req, res) => {
  const validatedData = updateSkillsSchema.parse(req.body);

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if user can update skills (own profile or admin)
  if (user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this user\'s skills'
    });
  }

  user.skills = validatedData.skills;
  await user.save();

  res.json({
    success: true,
    data: user.skills
  });
});

// @desc    Verify user skill (admin only)
// @route   PUT /api/users/:id/skills/:skillName/verify
// @access  Private
const verifyUserSkill = asyncHandler(async (req, res) => {
  const { skillName } = req.params;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const skill = user.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());

  if (!skill) {
    return res.status(404).json({
      success: false,
      message: 'Skill not found'
    });
  }

  skill.verified = true;
  await user.save();

  res.json({
    success: true,
    data: skill
  });
});

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Get user
  const user = await User.findById(userId).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get issue statistics
  const postedIssues = await Issue.countDocuments({ postedBy: userId });
  const assignedIssues = await Issue.countDocuments({ assignedTo: userId });
  const resolvedIssues = await Issue.countDocuments({ 'resolution.resolvedBy': userId });
  const openIssues = await Issue.countDocuments({ 
    $or: [{ postedBy: userId }, { assignedTo: userId }],
    status: { $in: ['open', 'assigned', 'in_progress'] }
  });

  // Get average resolution time
  const resolvedIssuesData = await Issue.find({ 'resolution.resolvedBy': userId });
  const totalResolutionTime = resolvedIssuesData.reduce((sum, issue) => sum + (issue.resolution.timeSpent || 0), 0);
  const avgResolutionTime = resolvedIssues > 0 ? totalResolutionTime / resolvedIssues : 0;

  // Get recent activity
  const recentIssues = await Issue.find({
    $or: [{ postedBy: userId }, { assignedTo: userId }]
  })
  .sort({ updatedAt: -1 })
  .limit(5)
  .populate('postedBy', 'firstName lastName')
  .populate('assignedTo', 'firstName lastName');

  // Get skill distribution
  const skillStats = user.skills.map(skill => ({
    name: skill.name,
    level: skill.level,
    verified: skill.verified
  }));

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position,
        rating: user.rating,
        availability: user.availability
      },
      statistics: {
        postedIssues,
        assignedIssues,
        resolvedIssues,
        openIssues,
        avgResolutionTime: Math.round(avgResolutionTime),
        totalTimeHelped: user.contributions.totalTimeHelped
      },
      skills: skillStats,
      recentActivity: recentIssues
    }
  });
});

// @desc    Get top contributors
// @route   GET /api/users/top-contributors
// @access  Private
const getTopContributors = asyncHandler(async (req, res) => {
  const { limit = 10, timeframe = 'all' } = req.query;

  let dateFilter = {};
  if (timeframe === 'month') {
    dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  } else if (timeframe === 'week') {
    dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  }

  // Get users with highest resolution counts
  const topResolvers = await User.find({ isActive: true })
    .select('firstName lastName employeeId department rating contributions')
    .sort({ 'contributions.issuesResolved': -1 })
    .limit(parseInt(limit));

  // Get users with highest ratings
  const topRated = await User.find({ isActive: true, 'rating.count': { $gt: 0 } })
    .select('firstName lastName employeeId department rating contributions')
    .sort({ 'rating.average': -1 })
    .limit(parseInt(limit));

  // Get recent issue resolvers
  const recentResolvers = await Issue.aggregate([
    { $match: { ...dateFilter, status: 'resolved' } },
    { $group: { _id: '$resolution.resolvedBy', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        employeeId: '$user.employeeId',
        department: '$user.department',
        resolvedCount: '$count'
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      topResolvers,
      topRated,
      recentResolvers
    }
  });
});

// @desc    Search users by skills
// @route   GET /api/users/search/skills
// @access  Private
const searchUsersBySkills = asyncHandler(async (req, res) => {
  const { skills, availability, department, page = 1, limit = 10 } = req.query;

  if (!skills) {
    return res.status(400).json({
      success: false,
      message: 'Skills parameter is required'
    });
  }

  const skillArray = skills.split(',').map(skill => skill.trim());

  // Build filter
  const filter = { isActive: true };
  if (availability) filter.availability = availability;
  if (department) filter.department = new RegExp(department, 'i');
  filter['skills.name'] = { $in: skillArray.map(skill => new RegExp(skill, 'i')) };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(filter)
    .select('-password')
    .sort({ 'rating.average': -1, 'contributions.issuesResolved': -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

module.exports = {
  getUsers,
  getUser,
  getUserIssues,
  updateUserSkills,
  verifyUserSkill,
  getUserStats,
  getTopContributors,
  searchUsersBySkills
}; 