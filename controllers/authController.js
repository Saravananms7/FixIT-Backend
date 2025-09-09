const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { z } = require('zod');

// Validation schemas
const registerSchema = z.object({
  employeeId: z.string().min(3).max(20),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string().min(2).max(100),
  position: z.string().min(2).max(100),
  skills: z.array(z.object({
    name: z.string().min(2).max(50),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional()
  })).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);

  // Check if user already exists
  const userExists = await User.findOne({ 
    $or: [{ email: validatedData.email }, { employeeId: validatedData.employeeId }] 
  });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email or employee ID'
    });
  }

  // Create user
  const user = await User.create(validatedData);

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        position: user.position,
        skills: user.skills,
        rating: user.rating,
        contributions: user.contributions,
        availability: user.availability,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid user data'
    });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);

  // Check for user
  const user = await User.findOne({ email: validatedData.email });

  if (user && (await user.comparePassword(validatedData.password))) {
    // Update last active
    user.lastActive = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        position: user.position,
        skills: user.skills,
        rating: user.rating,
        contributions: user.contributions,
        availability: user.availability,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.department = req.body.department || user.department;
    user.position = req.body.position || user.position;
    user.availability = req.body.availability || user.availability;
    user.skills = req.body.skills || user.skills;
    user.profilePicture = req.body.profilePicture || user.profilePicture;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        employeeId: updatedUser.employeeId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        department: updatedUser.department,
        position: updatedUser.position,
        skills: updatedUser.skills,
        rating: updatedUser.rating,
        contributions: updatedUser.contributions,
        availability: updatedUser.availability,
        profilePicture: updatedUser.profilePicture,
        token: generateToken(updatedUser._id)
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
});

// @desc    Update user availability
// @route   PUT /api/auth/availability
// @access  Private
const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;

  if (!['available', 'busy', 'unavailable'].includes(availability)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid availability status'
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { 
      availability,
      lastActive: new Date()
    },
    { new: true }
  ).select('-password');

  res.json({
    success: true,
    data: user
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updateAvailability
}; 