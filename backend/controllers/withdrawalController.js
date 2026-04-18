const { pool } = require('../config/db');
const crypto = require('crypto');

// ── Encryption helpers (AES-256-CBC) ─────────────────────────────────────────
const ENC_KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'dreamPaintings_enc_key_32bytes!!').padEnd(32).slice(0, 32)
);
const IV_LEN = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(text)), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(text) {
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString();
  } catch {
    return '****';
  }
}

function maskAccount(enc) {
  if (!enc) return '****';
  const plain = decrypt(enc);
  if (plain === '****' || plain.length < 4) return '****';
  return plain.slice(0, -4).replace(/./g, '*') + plain.slice(-4);
}

// ── Audit log ─────────────────────────────────────────────────────────────────
async function auditLog(withdrawalId, adminId, action, oldStatus, newStatus, oldAmount, newAmount, reason) {
  await pool.query(
    `INSERT INTO withdrawal_audit_logs
      (withdrawal_id, admin_id, action, old_status, new_status, old_amount, new_amount, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [withdrawalId, adminId, action, oldStatus, newStatus, oldAmount, newAmount, reason]
  );
}

// ── Notify seller (always "DreamPaintings Team") ──────────────────────────────
async function notifySeller(userId, message) {
  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
    [userId, message]
  );
}

// ── Seller: get earnings summary ──────────────────────────────────────────────
const getEarnings = async (req, res) => {
  try {
    // Total earned from approved orders on artist's paintings
    const earningsRes = await pool.query(
      `SELECT COALESCE(SUM(o.amount),0) as total
       FROM orders o
       JOIN paintings p ON o.painting_id=p.id
       WHERE p.artist_id=$1 AND o.status='approved'`,
      [req.user.id]
    );
    const totalEarnings = parseFloat(earningsRes.rows[0].total);

    // Already paid out (paid withdrawals)
    const paidRes = await pool.query(
      `SELECT COALESCE(SUM(original_amount),0) as total
       FROM withdrawals WHERE user_id=$1 AND status='paid'`,
      [req.user.id]
    );
    const totalPaid = parseFloat(paidRes.rows[0].total);

    // Locked in pending/approved withdrawals
    const lockedRes = await pool.query(
      `SELECT COALESCE(SUM(original_amount),0) as total
       FROM withdrawals WHERE user_id=$1 AND status IN ('pending','approved')`,
      [req.user.id]
    );
    const pending = parseFloat(lockedRes.rows[0].total);

    const withdrawable = Math.max(0, totalEarnings - totalPaid - pending);

    res.json({ totalEarnings, withdrawable, pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Seller: submit withdrawal request ─────────────────────────────────────────
const createWithdrawal = async (req, res) => {
  const { full_name, bank_name, account_number, ifsc_code, upi_id, amount, note, policy_agreed } = req.body;

  // Coerce policy_agreed — it may arrive as boolean true or string "true"
  const agreedBool = policy_agreed === true || policy_agreed === 'true';
  if (!agreedBool) return res.status(400).json({ message: 'You must agree to the withdrawal policy.' });
  if (!full_name || !bank_name || !account_number || !ifsc_code)
    return res.status(400).json({ message: 'Full name, bank name, account number, and IFSC are required.' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 500)
    return res.status(400).json({ message: 'Minimum withdrawal amount is ₹500.' });

  try {
    // Compute real available balance (same logic as getEarnings)
    const earningsRes = await pool.query(
      `SELECT COALESCE(SUM(o.amount),0) as total FROM orders o
       JOIN paintings p ON o.painting_id=p.id
       WHERE p.artist_id=$1 AND o.status='approved'`,
      [req.user.id]
    );
    const paidRes = await pool.query(
      `SELECT COALESCE(SUM(original_amount),0) as total FROM withdrawals
       WHERE user_id=$1 AND status='paid'`,
      [req.user.id]
    );
    const lockedRes = await pool.query(
      `SELECT COALESCE(SUM(original_amount),0) as total FROM withdrawals
       WHERE user_id=$1 AND status IN ('pending','approved')`,
      [req.user.id]
    );
    const available = Math.max(0,
      parseFloat(earningsRes.rows[0].total) -
      parseFloat(paidRes.rows[0].total) -
      parseFloat(lockedRes.rows[0].total)
    );
    if (amt > available)
      return res.status(400).json({ message: 'Amount exceeds your withdrawable balance.' });

    // Block duplicate pending request
    const dupRes = await pool.query(
      "SELECT id FROM withdrawals WHERE user_id=$1 AND status='pending'",
      [req.user.id]
    );
    if (dupRes.rows.length)
      return res.status(400).json({ message: 'You already have a pending withdrawal request.' });

    // Max 2 requests per day
    const dayRes = await pool.query(
      "SELECT COUNT(*) FROM withdrawals WHERE user_id=$1 AND created_at > NOW() - INTERVAL '1 day'",
      [req.user.id]
    );
    if (parseInt(dayRes.rows[0].count) >= 2)
      return res.status(400).json({ message: 'Maximum 2 withdrawal requests allowed per day.' });

    const encAccount = encrypt(account_number);

    const result = await pool.query(
      `INSERT INTO withdrawals
        (user_id, original_amount, final_amount, bank_name, account_number_enc, ifsc_code, upi_id, full_name, note, policy_agreed)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user.id, amt, bank_name, encAccount, ifsc_code.toUpperCase(), upi_id || null, full_name, note || null, true]
    );

    res.status(201).json({ message: 'Withdrawal request submitted successfully.', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Seller: get own withdrawal history ────────────────────────────────────────
const getMyWithdrawals = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, original_amount, modified_amount, hold_amount, final_amount,
              bank_name, ifsc_code, upi_id, full_name, note, status,
              admin_action_reason, updated_by, created_at, updated_at,
              account_number_enc
       FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    const sanitized = rows.map(({ account_number_enc, ...r }) => ({
      ...r,
      account_number_masked: maskAccount(account_number_enc),
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Seller: get single withdrawal detail ──────────────────────────────────────
const getWithdrawalDetail = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*, u.name as seller_name
       FROM withdrawals w JOIN users u ON w.user_id=u.id
       WHERE w.id=$1 AND w.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const r = rows[0];

    const logs = await pool.query(
      `SELECT action, old_status, new_status, old_amount, new_amount, reason, created_at,
              'DreamPaintings Team' as performed_by
       FROM withdrawal_audit_logs WHERE withdrawal_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );

    const { account_number_enc, admin_id: _aid, ...safeRow } = r;
    res.json({
      ...safeRow,
      account_number_masked: maskAccount(account_number_enc),
      timeline: logs.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Seller: raise dispute ─────────────────────────────────────────────────────
const raiseDispute = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, user_id, status FROM withdrawals WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    if (!['rejected', 'on_hold'].includes(rows[0].status))
      return res.status(400).json({ message: 'Disputes can only be raised on rejected or on-hold requests.' });

    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES (
        (SELECT id FROM users WHERE role='admin' LIMIT 1),
        $1
      )`,
      [`Seller raised a dispute on withdrawal #${req.params.id}: ${reason}`]
    );
    res.json({ message: 'Dispute raised. DreamPaintings Team will review it.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get all withdrawals ────────────────────────────────────────────────
const adminGetWithdrawals = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE w.status=$1'; params.push(status); }

  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.original_amount, w.modified_amount, w.hold_amount, w.final_amount,
              w.bank_name, w.ifsc_code, w.upi_id, w.full_name, w.note, w.status,
              w.admin_action_reason, w.updated_by, w.created_at, w.updated_at,
              w.account_number_enc,
              u.name as seller_name, u.email as seller_email, u.id as seller_id
       FROM withdrawals w JOIN users u ON w.user_id=u.id
       ${where} ORDER BY w.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM withdrawals w ${where}`, params
    );
    const sanitized = rows.map(({ account_number_enc, ...r }) => ({
      ...r,
      account_number_masked: maskAccount(account_number_enc),
    }));
    res.json({ withdrawals: sanitized, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: update withdrawal (approve/reject/modify/hold/release/paid) ────────
const adminUpdateWithdrawal = async (req, res) => {
  const { action, reason, modified_amount, hold_amount } = req.body;
  const VALID_ACTIONS = ['approve', 'reject', 'modify', 'hold', 'release_hold', 'mark_paid'];
  if (!VALID_ACTIONS.includes(action))
    return res.status(400).json({ message: 'Invalid action' });
  if (!reason)
    return res.status(400).json({ message: 'Reason is required for all admin actions.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM withdrawals WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const w = rows[0];
    const oldStatus = w.status;
    const oldAmount = w.final_amount;

    let newStatus = oldStatus;
    let newFinal = w.final_amount;
    let newModified = w.modified_amount;
    let newHold = w.hold_amount;
    let notifMsg = '';

    if (action === 'approve') {
      if (oldStatus !== 'pending') return res.status(400).json({ message: 'Only pending requests can be approved.' });
      newStatus = 'approved';
      newFinal = w.modified_amount || w.original_amount;
      notifMsg = 'Your withdrawal request has been approved and is being processed. — DreamPaintings Team';
    } else if (action === 'reject') {
      if (!['pending', 'on_hold'].includes(oldStatus))
        return res.status(400).json({ message: 'Cannot reject this request.' });
      newStatus = 'rejected';
      notifMsg = `Your withdrawal request has been rejected. Please check details. — DreamPaintings Team`;
    } else if (action === 'modify') {
      const modAmt = parseFloat(modified_amount);
      if (isNaN(modAmt) || modAmt <= 0)
        return res.status(400).json({ message: 'Valid modified amount required.' });
      if (modAmt > w.original_amount)
        return res.status(400).json({ message: 'Modified amount cannot exceed original amount.' });
      newModified = modAmt;
      newFinal = modAmt - (w.hold_amount || 0);
      notifMsg = 'Your withdrawal request amount has been updated by DreamPaintings Team. Please review the updated details.';
    } else if (action === 'hold') {
      const holdAmt = parseFloat(hold_amount);
      if (isNaN(holdAmt) || holdAmt < 0)
        return res.status(400).json({ message: 'Valid hold amount required.' });
      const base = w.modified_amount || w.original_amount;
      if (holdAmt > base)
        return res.status(400).json({ message: 'Hold amount cannot exceed the withdrawal amount.' });
      newHold = holdAmt;
      newFinal = base - holdAmt;
      newStatus = holdAmt >= base ? 'on_hold' : oldStatus;
      notifMsg = 'A portion of your earnings has been placed on hold due to internal review. — DreamPaintings Team';
    } else if (action === 'release_hold') {
      if (oldStatus !== 'on_hold') return res.status(400).json({ message: 'Request is not on hold.' });
      newHold = 0;
      newFinal = w.modified_amount || w.original_amount;
      newStatus = 'pending';
      notifMsg = 'The hold on your withdrawal request has been released. — DreamPaintings Team';
    } else if (action === 'mark_paid') {
      if (oldStatus !== 'approved') return res.status(400).json({ message: 'Only approved requests can be marked as paid.' });
      newStatus = 'paid';
      notifMsg = 'Your withdrawal has been successfully processed. — DreamPaintings Team';
    }

    await pool.query(
      `UPDATE withdrawals SET
        status=$1, modified_amount=$2, hold_amount=$3, final_amount=$4,
        admin_action_reason=$5, updated_by='DreamPaintings Team',
        admin_id=$6, updated_at=NOW()
       WHERE id=$7`,
      [newStatus, newModified, newHold, newFinal, reason, req.user.id, req.params.id]
    );

    await auditLog(req.params.id, req.user.id, action, oldStatus, newStatus, oldAmount, newFinal, reason);
    await notifySeller(w.user_id, notifMsg);

    res.json({ message: 'Withdrawal updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get audit timeline for a withdrawal ────────────────────────────────
const adminGetAuditLog = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT action, old_status, new_status, old_amount, new_amount, reason, created_at,
              'DreamPaintings Team' as performed_by
       FROM withdrawal_audit_logs WHERE withdrawal_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get withdrawal stats ───────────────────────────────────────────────
const adminGetWithdrawalStats = async (req, res) => {
  try {
    const [pending, approved, paid, total] = await Promise.all([
      pool.query("SELECT COUNT(*), COALESCE(SUM(original_amount),0) as amt FROM withdrawals WHERE status='pending'"),
      pool.query("SELECT COUNT(*), COALESCE(SUM(final_amount),0) as amt FROM withdrawals WHERE status='approved'"),
      pool.query("SELECT COUNT(*), COALESCE(SUM(final_amount),0) as amt FROM withdrawals WHERE status='paid'"),
      pool.query("SELECT COUNT(*), COALESCE(SUM(original_amount),0) as amt FROM withdrawals"),
    ]);
    res.json({
      pending: { count: parseInt(pending.rows[0].count), amount: parseFloat(pending.rows[0].amt) },
      approved: { count: parseInt(approved.rows[0].count), amount: parseFloat(approved.rows[0].amt) },
      paid: { count: parseInt(paid.rows[0].count), amount: parseFloat(paid.rows[0].amt) },
      total: { count: parseInt(total.rows[0].count), amount: parseFloat(total.rows[0].amt) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getEarnings, createWithdrawal, getMyWithdrawals, getWithdrawalDetail, raiseDispute,
  adminGetWithdrawals, adminUpdateWithdrawal, adminGetAuditLog, adminGetWithdrawalStats,
};
