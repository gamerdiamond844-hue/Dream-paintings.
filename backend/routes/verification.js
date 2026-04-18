const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadVerificationDoc, uploadBadgePaymentProof } = require('../config/cloudinary');
const {
  applyForVerification,
  getMyVerificationStatus,
  submitBadgePayment,
  createBadgeRazorpayOrder,
  verifyBadgeRazorpayPayment,
  adminListRequests,
  adminApproveRequest,
  adminRejectRequest,
  adminRemoveBadge,
  adminAssignBadge,
  adminGetVerifiedUsers,
} = require('../controllers/verificationController');

// ── User routes ───────────────────────────────────────────────────────────────
router.get('/my-status', auth, getMyVerificationStatus);
router.post('/apply', auth, uploadVerificationDoc.single('document'), applyForVerification);

// Payment routes
router.post('/:id/pay/upi',      auth, uploadBadgePaymentProof.single('payment_proof'), submitBadgePayment);
router.post('/:id/pay/razorpay', auth, createBadgeRazorpayOrder);
router.post('/:id/pay/razorpay/verify', auth, verifyBadgeRazorpayPayment);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/requests',                auth, requireRole('admin'), adminListRequests);
router.put('/admin/requests/:id/approve',    auth, requireRole('admin'), adminApproveRequest);
router.put('/admin/requests/:id/reject',     auth, requireRole('admin'), adminRejectRequest);
router.delete('/admin/users/:userId/badge',  auth, requireRole('admin'), adminRemoveBadge);
router.post('/admin/users/:userId/badge',    auth, requireRole('admin'), adminAssignBadge);
router.get('/admin/verified-users',          auth, requireRole('admin'), adminGetVerifiedUsers);

module.exports = router;
