const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const {
  getEarnings, createWithdrawal, getMyWithdrawals, getWithdrawalDetail, raiseDispute,
} = require('../controllers/withdrawalController');

router.use(auth);

// Static routes MUST come before /:id to avoid param conflicts
router.get('/earnings', getEarnings);
router.get('/', getMyWithdrawals);
router.post('/', requireRole('artist', 'admin'), createWithdrawal);
// Parameterized routes last
router.get('/:id', getWithdrawalDetail);
router.post('/:id/dispute', raiseDispute);

module.exports = router;
