const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const {
  getPublicProfile, updateProfile, getMyDashboard,
  addReview, createCoupon, getMyCoupons, validateCoupon, deleteCoupon,
  blockUser, saveAddress
} = require('../controllers/userController');

const profileUpload = uploadAvatar.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

router.get('/:userId/profile', getPublicProfile);
router.put('/me/profile', auth, profileUpload, updateProfile);
router.get('/me/dashboard', auth, getMyDashboard);
router.post('/reviews', auth, addReview);
router.post('/coupons', auth, createCoupon);
router.get('/me/coupons', auth, getMyCoupons);
router.delete('/coupons/:id', auth, deleteCoupon);
router.post('/coupons/validate', validateCoupon);
router.post('/block', auth, blockUser);
router.post('/me/addresses', auth, saveAddress);

module.exports = router;
