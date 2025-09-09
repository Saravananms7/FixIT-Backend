const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['hardware', 'software', 'network', 'printer', 'email', 'access', 'other']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requiredSkills: [{
    type: String,
    required: true,
    trim: true
  }],
  location: {
    building: {
      type: String,
      trim: true
    },
    floor: {
      type: String,
      trim: true
    },
    room: {
      type: String,
      trim: true
    }
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isSolution: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    solution: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      trim: true
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  estimatedTime: {
    type: Number, // in minutes
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
issueSchema.index({ status: 1, priority: -1, createdAt: -1 });
issueSchema.index({ postedBy: 1, status: 1 });
issueSchema.index({ assignedTo: 1, status: 1 });
issueSchema.index({ requiredSkills: 1, status: 1 });
issueSchema.index({ category: 1, status: 1 });

// Virtual for vote count
issueSchema.virtual('voteCount').get(function() {
  return this.upvotes.length - this.downvotes.length;
});

// Method to check if user can vote
issueSchema.methods.canVote = function(userId) {
  return !this.upvotes.includes(userId) && !this.downvotes.includes(userId);
};

// Method to add upvote
issueSchema.methods.addUpvote = function(userId) {
  if (this.canVote(userId)) {
    this.upvotes.push(userId);
    return true;
  }
  return false;
};

// Method to add downvote
issueSchema.methods.addDownvote = function(userId) {
  if (this.canVote(userId)) {
    this.downvotes.push(userId);
    return true;
  }
  return false;
};

// Method to resolve issue
issueSchema.methods.resolve = function(resolvedBy, solution, timeSpent) {
  this.status = 'resolved';
  this.resolution.resolvedBy = resolvedBy;
  this.resolution.solution = solution;
  this.resolution.resolvedAt = new Date();
  this.resolution.timeSpent = timeSpent || 0;
};

// Method to add comment
issueSchema.methods.addComment = function(userId, content, isSolution = false) {
  this.comments.push({
    user: userId,
    content,
    isSolution
  });
};

// Ensure virtual fields are serialized
issueSchema.set('toJSON', { virtuals: true });
issueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Issue', issueSchema); 