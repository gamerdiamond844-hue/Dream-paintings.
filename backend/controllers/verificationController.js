const crypto = require('crypto');
const { pool } = require('../config/db');

// Badge prices in rupees
const BADGE_PRICES = { red: 299, blue: 99 };

let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      throw new Error('Razorpay keys not configured');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

const log = async (adminId, action, targetId, details) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
      [adminId, action, 'verification', targetId, details]
    );
  } catch (_) {}
};

// ── User: submit application ──────────────────────────────────────────────────
const applyForVerification = async (req, res) => {
  const userId = req.user.id;
  const { full_name, reason, portfolio_links, badge_level = 'red' } = req.body;
  const document_url = req.file?.path || null;

  if (!full_name?.trim() || !reason?.trim())
    return res.status(400).json({ message: 'Full name and reason are required' });
  if (!['red', 'blue'].includes(badge_level))
    return res.status(400).json({ message: 'Invalid badge level' });

  try {
    const existing = await pool.query(
      `SELECT id, status FROM verification_requests
       WHERE user_id=$1 AND status IN ('pending','approved') LIMIT 1`,
      [userId]
    );
    if (existing.rows.length) {
      const s = existing.rows[0].status;
      return res.status(409).json({
        message: s === 'approved'
          ? 'You already have a verified badge.'
          : 'You already have a pending application.',
      });
    }

    const amount = BADGE_PRICES[badge_level];
    const r = await pool.query(
      `INSERT INTO verification_requests
         (user_id, full_name, reason, portfolio_links, document_url, badge_level, amount, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'unpaid') RETURNING *`,
      [userId, full_name.trim(), reason.trim(), portfolio_links || null, document_url, badge_level, amount]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── User: get own application status ─────────────────────────────────────────
const getMyVerificationStatus = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, status, badge_level, rejection_reason, payment_status,
              amount, created_at, reviewed_at
       FROM verification_requests WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(r.rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── User: submit QR/UPI payment proof ────────────────────────────────────────
const submitBadgePayment = async (req, res) => {
  const { id } = req.params; // verification_request id
  const { transaction_id } = req.body;
  const payment_proof = req.file?.path || null;

  if (!payment_proof)
    return res.status(400).json({ message: 'Payment screenshot is required' });

  try {
    const vr = await pool.query(
      'SELECT * FROM verification_requests WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!vr.rows.length)
      return res.status(404).json({ message: 'Application not found' });
    if (vr.rows[0].payment_status === 'paid')
      return res.status(409).json({ message: 'Payment already submitted' });

    const r = await pool.query(
      `UPDATE verification_requests
       SET payment_proof=$1, transaction_id=$2, payment_status='pending',
           payment_gateway='upi'
       WHERE id=$3 RETURNING *`,
      [payment_proof, transaction_id || null, id]
    );

    // Notify admins
    const admins = await pool.query("SELECT id FROM users WHERE role='admin'");
    await Promise.all(admins.rows.map(a =>
      pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [
        a.id,
        `💳 Badge payment proof submitted by user ${req.user.id} for ${vr.rows[0].badge_level} badge (₹${vr.rows[0].amount}). Please verify and approve.`,
      ])
    ));

    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── User: create Razorpay order for badge ─────────────────────────────────────
const createBadgeRazorpayOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const vr = await pool.query(
      'SELECT * FROM verification_requests WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!vr.rows.length)
      return res.status(404).json({ message: 'Application not found' });
    if (vr.rows[0].payment_status === 'paid')
      return res.status(409).json({ message: 'Already paid' });

    const amount = vr.rows[0].amount || BADGE_PRICES[vr.rows[0].badge_level];
    const rzOrder = await getRazorpay().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `badge_${id}_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      order_id: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── User: verify Razorpay badge payment ───────────────────────────────────────
const verifyBadgeRazorpayPayment = async (req, res) => {
  const { id } = req.params;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature)
    return res.status(400).json({ message: 'Razorpay payment details required' });

  try {
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (sig !== razorpay_signature)
      return res.status(400).json({ message: 'Payment signature verification failed' });

    const vr = await pool.query(
      'SELECT * FROM verification_requests WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!vr.rows.length)
      return res.status(404).json({ message: 'Application not found' });

    const r = await pool.query(
      `UPDATE verification_requests
       SET payment_status='paid', payment_gateway='razorpay',
           payment_id=$1, payment_order_id=$2, payment_signature=$3
       WHERE id=$4 RETURNING *`,
      [razorpay_payment_id, razorpay_order_id, razorpay_signature, id]
    );

    // Auto-approve after successful Razorpay payment
    const request = r.rows[0];
    await pool.query(
      `UPDATE verification_requests SET status='approved', reviewed_at=NOW() WHERE id=$1`,
      [id]
    );
    await pool.query(
      'UPDATE users SET is_verified=TRUE, badge_level=$1 WHERE id=$2',
      [request.badge_level, request.user_id]
    );
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [request.user_id,
       `🎉 Payment successful! Your ${request.badge_level === 'red' ? '🔴 Red Premium' : '🔵 Blue Standard'} Verified Badge is now active on your profile!`]
    );
    await log(null, `Auto-approved ${request.badge_level} badge after Razorpay payment`, id, razorpay_payment_id);

    res.json({ message: 'Payment verified. Badge activated!', request: r.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: list all requests ──────────────────────────────────────────────────
const adminListRequests = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';
  if (status) { params.push(status); where += ` AND vr.status=$${params.length}`; }
  params.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT vr.*, u.name as user_name, u.email as user_email,
              u.avatar_url, u.role, u.is_verified, u.badge_level as current_badge
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       ${where}
       ORDER BY vr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countParams = status ? [status] : [];
    const countWhere = status ? 'WHERE status=$1' : '';
    const count = await pool.query(
      `SELECT COUNT(*) FROM verification_requests ${countWhere}`,
      countParams
    );
    res.json({ requests: r.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: approve request (requires payment for UPI; Razorpay auto-approves) ─
const adminApproveRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const vr = await pool.query('SELECT * FROM verification_requests WHERE id=$1', [id]);
    if (!vr.rows.length) return res.status(404).json({ message: 'Request not found' });
    const request = vr.rows[0];

    // For UPI payments, admin must confirm payment before approving
    if (request.payment_gateway === 'upi' && request.payment_status !== 'paid') {
      // Mark UPI payment as confirmed
      await pool.query(
        'UPDATE verification_requests SET payment_status=$1 WHERE id=$2',
        ['paid', id]
      );
    }

    await pool.query(
      `UPDATE verification_requests
       SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`,
      [req.user.id, id]
    );
    await pool.query(
      'UPDATE users SET is_verified=TRUE, badge_level=$1 WHERE id=$2',
      [request.badge_level, request.user_id]
    );
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [request.user_id,
       `🎉 Congratulations! Your ${request.badge_level === 'red' ? '🔴 Red' : '🔵 Blue'} Verified Badge has been approved! Your profile is now verified on Dream Paintings.`]
    );
    await log(req.user.id, `Approved ${request.badge_level} badge for user ${request.user_id}`, id, null);
    res.json({ message: 'Badge approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: reject request ─────────────────────────────────────────────────────
const adminRejectRequest = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  try {
    const vr = await pool.query('SELECT * FROM verification_requests WHERE id=$1', [id]);
    if (!vr.rows.length) return res.status(404).json({ message: 'Request not found' });
    const request = vr.rows[0];

    await pool.query(
      `UPDATE verification_requests
       SET status='rejected', rejection_reason=$1, reviewed_by=$2, reviewed_at=NOW()
       WHERE id=$3`,
      [rejection_reason || null, req.user.id, id]
    );
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [request.user_id,
       `Your verification request was not approved.${rejection_reason ? ' Reason: ' + rejection_reason : ''} You may reapply after addressing the feedback.`]
    );
    await log(req.user.id, `Rejected badge request for user ${request.user_id}`, id, rejection_reason);
    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: remove badge ───────────────────────────────────────────────────────
const adminRemoveBadge = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('UPDATE users SET is_verified=FALSE, badge_level=NULL WHERE id=$1', [userId]);
    await pool.query(
      `UPDATE verification_requests SET status='rejected', rejection_reason='Badge removed by admin'
       WHERE user_id=$1 AND status='approved'`,
      [userId]
    );
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [userId, 'Your verified badge has been removed by an administrator.']);
    await log(req.user.id, `Removed badge from user ${userId}`, userId, null);
    res.json({ message: 'Badge removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: manually assign badge ─────────────────────────────────────────────
const adminAssignBadge = async (req, res) => {
  const { userId } = req.params;
  const { badge_level = 'red' } = req.body;
  if (!['red', 'blue'].includes(badge_level))
    return res.status(400).json({ message: 'Invalid badge level' });
  try {
    const u = await pool.query('SELECT name FROM users WHERE id=$1', [userId]);
    if (!u.rows.length) return res.status(404).json({ message: 'User not found' });
    await pool.query('UPDATE users SET is_verified=TRUE, badge_level=$1 WHERE id=$2', [badge_level, userId]);
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [userId, `🎉 You have been manually awarded the ${badge_level === 'red' ? '🔴 Red' : '🔵 Blue'} Verified Badge by an administrator!`]);
    await log(req.user.id, `Manually assigned ${badge_level} badge to user ${userId}`, userId, null);
    res.json({ message: 'Badge assigned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get verified users ─────────────────────────────────────────────────
const adminGetVerifiedUsers = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, email, role, avatar_url, badge_level, is_verified FROM users WHERE is_verified=TRUE ORDER BY name'
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
