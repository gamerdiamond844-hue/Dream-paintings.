const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadPaymentProof, uploadQR } = require('../config/cloudinary');
const { createOrder, getMyOrders, getOrderById, getQR, createRazorpayOrder, verifyRazorpayPayment } = require('../controllers/orderController');

router.get('/qr', getQR);
router.get('/my', auth, getMyOrders);
router.post('/razorpay/create', auth, createRazorpayOrder);
router.post('/razorpay/verify', auth, verifyRazorpayPayment);
router.post('/', auth, uploadPaymentProof.single('payment_proof'), createOrder);
router.get('/:id', auth, getOrderById);

module.exports = router;
