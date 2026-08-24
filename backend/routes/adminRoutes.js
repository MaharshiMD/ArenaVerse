const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  deleteTournamentAdmin,
  deleteTeamAdmin,
  getAdminReports,
  resolveDisputeAdmin,
  deleteReviewAdmin,
  getVerificationsAdmin,
  reviewVerificationAdmin,
  resetUser2FA,
  getEscalatedComplaints,
  resolveEscalatedComplaint,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin')); // Restrict all admin endpoints to Admin role only

router.get('/stats', getAdminStats);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-2fa', resetUser2FA);
router.delete('/tournaments/:id', deleteTournamentAdmin);
router.delete('/teams/:id', deleteTeamAdmin);
router.get('/reports', getAdminReports);
router.put('/reports/:id/resolve', resolveDisputeAdmin);
router.delete('/reviews/:id', deleteReviewAdmin);
router.get('/verifications', getVerificationsAdmin);
router.put('/verifications/:userId/review', reviewVerificationAdmin);
router.get('/escalated-complaints', getEscalatedComplaints);
router.patch('/escalated-complaints/:id', resolveEscalatedComplaint);

module.exports = router;
