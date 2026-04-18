const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadQR } = require('../config/cloudinary');
const {
  getStats, getAllUsers, deleteUser, banUser, promoteUser,
  getAllPaintings, getPendingPaintings, updatePaintingAdmin, softDeletePainting, restorePainting, bulkAction,
  getAllComments, deleteComment,
  getSales, getActivityLogs,
  sendNotification, getNotifications, markNotificationsRead,
  getHomepageConfig, saveHomepageConfig,
  getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  setMasterArtist, getMasterArtists,
} = require('../controllers/adminController');
const { getAllOrders, updateOrderStatus, uploadQRCode } = require('../controllers/orderController');
const {
  adminGetWithdrawals, adminUpdateWithdrawal, adminGetAuditLog, adminGetWithdrawalStats,
} = require('../controllers/withdrawalController');

router.use(auth, requireRole('admin'));

router.get('/stats', getStats);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/role', promoteUser);
router.put('/users/:id/master-artist', setMasterArtist);
router.get('/master-artists', getMasterArtists);

router.get('/paintings', getAllPaintings);
router.get('/pending-paintings', getPendingPaintings);
router.put('/paintings/:id', updatePaintingAdmin);
router.delete('/paintings/:id', softDeletePainting);
router.put('/paintings/:id/restore', restorePainting);
router.post('/paintings/bulk', bulkAction);

router.get('/comments', getAllComments);
router.delete('/comments/:id', deleteComment);

router.get('/sales', getSales);
router.get('/activity-logs', getActivityLogs);

router.post('/notify', sendNotification);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);

router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/qr', uploadQR.single('qr'), uploadQRCode);

router.get('/homepage/config', getHomepageConfig);
router.post('/homepage/config', saveHomepageConfig);
router.get('/homepage/testimonials', getTestimonials);
router.post('/homepage/testimonials', createTestimonial);
router.put('/homepage/testimonials/:id', updateTestimonial);
router.delete('/homepage/testimonials/:id', deleteTestimonial);

// Withdrawal management
router.get('/withdrawals/stats', adminGetWithdrawalStats);
router.get('/withdrawals', adminGetWithdrawals);
router.put('/withdrawals/:id', adminUpdateWithdrawal);
router.get('/withdrawals/:id/audit', adminGetAuditLog);

module.exports = router;
