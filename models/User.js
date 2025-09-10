const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  contributions: {
    issuesResolved: {
      type: Number,
      default: 0
    },
    issuesPosted: {
      type: Number,
      default: 0
    },
    totalTimeHelped: {
      type: Number,
      default: 0 // in minutes
    },
    points: {
      type: Number,
      default: 0
    }
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ skills: 1, availability: 1, rating: -1 });
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Method to calculate helper score for AI ranking
// Considers skills match, user experience (points, issues resolved, rating),
// domain relevance (user department vs issue category), and issue priority.
userSchema.methods.calculateHelperScore = function(requiredSkills, category = 'other', priority = 'medium') {
  let skillScore = 0;
  let historyScore = 0;
  let engagementScore = 0;
  let domainScore = 0;

  // Skill relevance score
  const userSkillNames = this.skills.map(skill => skill.name.toLowerCase());
  const matchingSkills = requiredSkills.filter(skill => 
    userSkillNames.includes(skill.toLowerCase())
  );
  skillScore = matchingSkills.length / requiredSkills.length;

  // History score based on resolved issues, points, and rating
  const pointsScore = Math.min(this.contributions.points / 100, 1); // Normalize points to 0-1
  const resolvedScore = Math.min(this.contributions.issuesResolved / 10, 1);
  const ratingScore = this.rating.average / 5;
  historyScore = (pointsScore * 0.4 + resolvedScore * 0.3 + ratingScore * 0.3);

  // Engagement score based on recent activity and availability
  const daysSinceLastActive = (Date.now() - this.lastActive.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - (daysSinceLastActive / 30));
  const availabilityScore = this.availability === 'available' ? 1 : 
                           this.availability === 'busy' ? 0.5 : 0;
  engagementScore = (recencyScore + availabilityScore) / 2;

  // Domain relevance based on department vs issue category
  const categoryToDepartments = {
    hardware: ['it', 'infrastructure', 'helpdesk', 'support'],
    software: ['it', 'engineering', 'development', 'helpdesk'],
    network: ['it', 'network', 'infrastructure', 'security'],
    printer: ['it', 'helpdesk', 'support'],
    email: ['it', 'helpdesk', 'support'],
    access: ['it', 'security', 'helpdesk'],
    other: []
  };
  const dept = (this.department || '').toLowerCase();
  const domainList = categoryToDepartments[category] || [];
  domainScore = domainList.length === 0 ? 0.2 : (domainList.some(d => dept.includes(d)) ? 1 : 0);

  // Weights
  const skillWeight = 0.35;
  const historyWeight = 0.30;
  const domainWeight = 0.20;
  const engagementWeight = 0.15;

  let baseScore = (skillScore * skillWeight) +
                  (historyScore * historyWeight) +
                  (domainScore * domainWeight) +
                  (engagementScore * engagementWeight);

  // Priority multiplier to favor faster/experienced helpers on urgent issues
  const priorityMultiplierMap = {
    urgent: 1.2,
    high: 1.1,
    medium: 1.0,
    low: 0.95
  };
  const priorityMultiplier = priorityMultiplierMap[priority] || 1.0;

  return baseScore * priorityMultiplier;
};

module.exports = mongoose.model('User', userSchema); 