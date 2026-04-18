const crypto = require('crypto');
const Razorpay = require('razorpay');
const { pool } = require('../config/db');

let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      throw new Error('Razorpay keys not configured');
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return razorpay;
};

const genOrderId = () => 'DP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

const getPaintingData = async (painting_id) => {
  const painting = await pool.query('SELECT * FROM paintings WHERE id=$1 AND status=$2 AND deleted_at IS NULL', [painting_id, 'approved']);
  if (!painting.rows.length) return null;
  return painting.rows[0];
};

const createOrderRecord = async ({ req, painting, amount, payment_proof, transaction_id, payment_gateway, payment_id, payment_order_id, payment_signature, payment_status, full_name, mobile, whatsapp, alternate_contact, email, address, city, state, pincode, landmark, notes }) => {
  const existing = await pool.query(
    "SELECT id FROM orders WHERE user_id=$1 AND painting_id=$2 AND status IN ('pending','approved')",
    [req.user.id, painting.id]
  );
  if (existing.rows.length) throw new Error('You already have an active order for this painting');

  const order_id = genOrderId();
  const result = await pool.query(
    `INSERT INTO orders (order_id,user_id,painting_id,amount,status,payment_proof,transaction_id,payment_gateway,payment_id,payment_order_id,payment_signature,payment_status,full_name,mobile,whatsapp,alternate_contact,email,address,city,state,pincode,landmark,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
    [order_id, req.user.id, painting.id, amount, 'pending', payment_proof || null, transaction_id || null, payment_gateway || null, payment_id || null, payment_order_id || null, payment_signature || null, payment_status || null, full_name, mobile, whatsapp || null, alternate_contact || null, email, address, city, state, pincode, landmark || null, notes || null]
  );

  const admins = await pool.query("SELECT id FROM users WHERE role='admin'");
  await Promise.all(admins.rows.map(a =>
    pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [a.id, `New order #${order_id} received from ${full_name} for "${painting.title}" — ₹${amount.toFixed(2)}`])
  ));

  return result.rows[0];
};

const createOrder = async (req, res) => {
  const { painting_id, full_name, mobile, whatsapp, alternate_contact, email, address, city, state, pincode, landmark, notes, transaction_id } = req.body;
  if (!painting_id || !full_name || !mobile || !email || !address || !city || !state || !pincode)
    return res.status(400).json({ message: 'Required fields missing' });

  try {
    const painting = await getPaintingData(painting_id);
    if (!painting) return res.status(404).json({ message: 'Painting not available' });

    const amount = painting.discount_percent > 0 ? parseFloat(painting.price) * (1 - painting.discount_percent / 100) : parseFloat(painting.price);
    const payment_proof = req.file?.path || null;

    const order = await createOrderRecord({
      req,
      painting,
      amount,
      payment_proof,
      transaction_id,
      full_name,
      mobile,
      whatsapp,
      alternate_contact,
      email,
      address,
      city,
      state,
      pincode,
      landmark,
      notes,
      payment_status: payment_proof ? 'pending' : null,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const createRazorpayOrder = async (req, res) => {
  const { painting_id } = req.body;
  if (!painting_id) return res.status(400).json({ message: 'Painting id is required' });

  try {
    const painting = await getPaintingData(painting_id);
    if (!painting) return res.status(404).json({ message: 'Painting not available' });

    const amount = painting.discount_percent > 0 ? parseFloat(painting.price) * (1 - painting.discount_percent / 100) : parseFloat(painting.price);
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `dp_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      receipt: razorpayOrder.receipt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  const {
    painting_id,
    full_name,
    mobile,
    whatsapp,
    alternate_contact,
    email,
    address,
    city,
    state,
    pincode,
    landmark,
    notes,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = req.body;

  if (!painting_id || !full_name || !mobile || !email || !address || !city || !state || !pincode)
    return res.status(400).json({ message: 'Required fields missing' });

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature)
    return res.status(400).json({ message: 'Razorpay payment details are required' });

  try {
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (signature !== razorpay_signature) return res.status(400).json({ message: 'Payment signature verification failed' });

    const painting = await getPaintingData(painting_id);
    if (!painting) return res.status(404).json({ message: 'Painting not available' });

    const amount = painting.discount_percent > 0 ? parseFloat(painting.price) * (1 - painting.discount_percent / 100) : parseFloat(painting.price);
    const order = await createOrderRecord({
      req,
      painting,
      amount,
      payment_gateway: 'razorpay',
      payment_id: razorpay_payment_id,
      payment_order_id: razorpay_order_id,
      payment_signature: razorpay_signature,
      payment_status: 'paid',
      full_name,
      mobile,
      whatsapp,
      alternate_contact,
      email,
      address,
      city,
      state,
      pincode,
      landmark,
      notes,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.title as painting_title, p.image_url, p.artist_id,
        u.name as artist_name
       FROM orders o
       LEFT JOIN paintings p ON o.painting_id=p.id
       LEFT JOIN users u ON p.artist_id=u.id
       WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.title as painting_title, p.image_url, p.description as painting_description,
        u.name as artist_name, u.avatar_url as artist_avatar
       FROM orders o
       LEFT JOIN paintings p ON o.painting_id=p.id
       LEFT JOIN users u ON p.artist_id=u.id
       WHERE o.id=$1 AND o.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getQR = async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key='payment_qr'");
    res.json({ qr_url: result.rows[0]?.value || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin controllers
const getAllOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE o.status=$1'; params.push(status); }
  try {
    const result = await pool.query(
      `SELECT o.*, p.title as painting_title, p.image_url, u.name as buyer_name, u.email as buyer_email
       FROM orders o
       LEFT JOIN paintings p ON o.painting_id=p.id
       LEFT JOIN users u ON o.user_id=u.id
       ${where} ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const countRes = await pool.query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    res.json({ orders: result.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, rejection_reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1, rejection_reason=$2 WHERE id=$3 RETURNING *',
      [status, rejection_reason || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = result.rows[0];

    const msg = status === 'approved'
      ? `🎉 Your order #${order.order_id} has been approved! Your painting is on its way.`
      : `❌ Your order #${order.order_id} was rejected. ${rejection_reason ? 'Reason: ' + rejection_reason : ''}`;
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [order.user_id, msg]);

    if (status === 'approved') {
      await pool.query("UPDATE paintings SET status='sold' WHERE id=$1", [order.painting_id]).catch(() => {});
      await pool.query(
        `INSERT INTO sales (user_id, painting_id, amount, status, created_at)
         VALUES ($1, $2, $3, 'completed', NOW())`,
        [order.user_id, order.painting_id, order.amount]
      ).catch(() => {});
    }

    const { pool: p2 } = require('../config/db');
    await p2.query(
      'INSERT INTO activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, `${status === 'approved' ? 'Approved' : 'Rejected'} order #${order.order_id}`, 'order', order.id, rejection_reason || null]
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const uploadQRCode = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    await pool.query(
      "INSERT INTO settings (key, value, updated_at) VALUES ('payment_qr',$1,NOW()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [req.file.path]
    );
    await pool.query(
      'INSERT INTO activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'Updated payment QR code', 'settings', null, null]
    );
    res.json({ qr_url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, getQR, getAllOrders, updateOrderStatus, uploadQRCode, createRazorpayOrder, verifyRazorpayPayment };
