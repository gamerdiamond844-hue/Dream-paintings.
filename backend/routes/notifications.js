const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getNotifications, markNotificationsRead } = require('../controllers/adminController');

router.get('/', auth, getNotifications);
router.put('/read', auth, markNotificationsRead);

module.exports = router;
