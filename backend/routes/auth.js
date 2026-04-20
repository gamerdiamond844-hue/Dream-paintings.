const express = require('express');
const router = express.Router();
const { register, login, googleAuth, getMe, updateProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', auth, getMe);
router.put('/profile', auth, uploadAvatar.single('avatar'), updateProfile);

module.exports = router;
