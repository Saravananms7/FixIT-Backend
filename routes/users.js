const express = require('express');
const {
  getUsers,
  getUser,
  getUserIssues,
  updateUserSkills,
  verifyUserSkill,
  getUserStats,
  getTopContributors,
  searchUsersBySkills
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// User management
router.route('/')
  .get(getUsers);

// Statistics and analytics (specific routes first)
router.get('/top-contributors', getTopContributors);
router.get('/search/skills', searchUsersBySkills);

// User issues
router.get('/:id/issues', getUserIssues);

// Skills management
router.put('/:id/skills', updateUserSkills);
router.put('/:id/skills/:skillName/verify', verifyUserSkill);

// Statistics and analytics
router.get('/:id/stats', getUserStats);

// User by ID (parameterized routes last)
router.route('/:id')
  .get(getUser);

module.exports = router; 