const express = require('express');
const {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  getHelperSuggestions,
  assignIssue,
  addComment,
  resolveIssue,
  markAsSolved,
  voteIssue
} = require('../controllers/issueController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Issue CRUD operations
router.route('/')
  .post(createIssue)
  .get(getIssues);

router.route('/:id')
  .get(getIssue)
  .put(updateIssue)
  .delete(deleteIssue);

// Helper matching and assignment
router.get('/:id/helpers', getHelperSuggestions);
router.put('/:id/assign', assignIssue);

// Comments and resolution
router.post('/:id/comments', addComment);
router.put('/:id/resolve', resolveIssue);
router.put('/:id/solve', markAsSolved);

// Voting
router.post('/:id/vote', voteIssue);

module.exports = router; 