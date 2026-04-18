const { pool } = require('../config/db');

const getPublicProfile = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await pool.query(
      `SELECT id, name, role, avatar_url, bio, cover_url, instagram, website, location, is_master_artist, created_at
       FROM users WHERE id=$1 AND is_banned=FALSE`,
      [userId]
    );
    if (!user.rows.length) return res.status(404).json({ message: 'User not found' });

    const u = user.rows[0];

    const [paintings, stats, reviews] = await Promise.all([
      u.role === 'artist' ? pool.query(
        `SELECT p.*, COUNT(DISTINCT l.user_id) as likes_count
         FROM paintings p LEFT JOIN likes l ON l.painting_id=p.id
         WHERE p.artist_id=$1 AND p.status='approved' AND p.deleted_at IS NULL
         GROUP BY p.id ORDER BY p.created_at DESC`,
        [userId]
      ) : { rows: [] },
      u.role === 'artist' ? pool.query(
        `SELECT
          COUNT(DISTINCT p.id) as total_paintings,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status='completed') as total_sales,
          COALESCE(SUM(s.amount) FILTER (WHERE s.status='completed'), 0) as total_earnings,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(DISTINCT r.id) as review_count
         FROM paintings p
         LEFT JOIN sales s ON s.painting_id=p.id
         LEFT JOIN reviews r ON r.seller_id=$1
         WHERE p.artist_id=$1`,
        [userId]
      ) : { rows: [{}] },
      pool.query(
        `SELECT r.*, u.name as buyer_name, u.avatar_url as buyer_avatar
         FROM reviews r JOIN users u ON u.id=r.buyer_id
         WHERE r.seller_id=$1 ORDER BY r.created_at DESC LIMIT 10`,
        [userId]
      ),
    ]);

    res.json({
      ...u,
      paintings: paintings.rows,
      stats: stats.rows[0] || {},
      reviews: reviews.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, bio, instagram, website, location } = req.body;
  const avatar_url = req.files?.avatar?.[0]?.path;
  const cover_url = req.files?.cover?.[0]?.path;
  const me = req.user.id;
  try {
    const fields = [], values = [];
    let idx = 1;
    const add = (col, val) => { if (val !== undefined) { fields.push(`${col}=$${idx++}`); values.push(val); } };
    add('name', name); add('bio', bio); add('instagram', instagram);
    add('website', website); add('location', location);
    if (avatar_url) add('avatar_url', avatar_url);
    if (cover_url) add('cover_url', cover_url);
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(me);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx}
       RETURNING id, name, email, role, avatar_url, cover_url, bio, instagram, website, location, is_master_artist`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyDashboard = async (req, res) => {
  const me = req.user.id;
  const { role } = req.user;
  try {
    if (role === 'artist') {
      const [stats, recentSales, topPaintings, monthlyData] = await Promise.all([
        pool.query(
          `SELECT
            COUNT(DISTINCT p.id) as total_paintings,
            COUNT(DISTINCT s.id) FILTER (WHERE s.status='completed') as total_sales,
            COALESCE(SUM(s.amount) FILTER (WHERE s.status='completed'), 0) as total_earnings,
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COUNT(DISTINCT r.id) as review_count,
            COALESCE(SUM(p.views), 0) as total_views
           FROM paintings p
           LEFT JOIN sales s ON s.painting_id=p.id
           LEFT JOIN reviews r ON r.seller_id=$1
           WHERE p.artist_id=$1`,
          [me]
        ),
        pool.query(
          `SELECT s.*, p.title, p.image_url, u.name as buyer_name
           FROM sales s JOIN paintings p ON p.id=s.painting_id JOIN users u ON u.id=s.user_id
           WHERE p.artist_id=$1 ORDER BY s.created_at DESC LIMIT 5`,
          [me]
        ),
        pool.query(
          `SELECT p.id, p.title, p.image_url, p.price, p.views, p.status,
            COUNT(DISTINCT l.user_id) as likes_count
           FROM paintings p LEFT JOIN likes l ON l.painting_id=p.id
           WHERE p.artist_id=$1 AND p.deleted_at IS NULL
           GROUP BY p.id ORDER BY p.views DESC LIMIT 6`,
          [me]
        ),
        pool.query(
          `SELECT TO_CHAR(s.created_at,'Mon') as month,
            EXTRACT(MONTH FROM s.created_at) as month_num,
            COUNT(*) as sales, COALESCE(SUM(s.amount),0) as revenue
           FROM sales s JOIN paintings p ON p.id=s.painting_id
           WHERE p.artist_id=$1 AND s.status='completed'
             AND s.created_at >= NOW() - INTERVAL '6 months'
           GROUP BY month, month_num ORDER BY month_num`,
          [me]
        ),
      ]);
      res.json({ stats: stats.rows[0], recentSales: recentSales.rows, topPaintings: topPaintings.rows, monthlyData: monthlyData.rows });
    } else {
      const [wishlist, orders, addresses] = await Promise.all([
        pool.query(
          `SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
            COUNT(DISTINCT l2.user_id) as likes_count
           FROM likes l JOIN paintings p ON p.id=l.painting_id
           JOIN users u ON u.id=p.artist_id
           LEFT JOIN likes l2 ON l2.painting_id=p.id
           WHERE l.user_id=$1 AND p.status='approved' AND p.deleted_at IS NULL
           GROUP BY p.id, u.name, u.avatar_url ORDER BY l.painting_id DESC`,
          [me]
        ),
        pool.query(
          `SELECT o.*, p.title, p.image_url, u.name as artist_name
           FROM orders o JOIN paintings p ON p.id=o.painting_id JOIN users u ON u.id=p.artist_id
           WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 10`,
          [me]
        ),
        pool.query(
          'SELECT * FROM saved_addresses WHERE user_id=$1 ORDER BY is_default DESC',
          [me]
        ),
      ]);
      res.json({ wishlist: wishlist.rows, orders: orders.rows, addresses: addresses.rows });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reviews
const addReview = async (req, res) => {
  const { seller_id, rating, comment } = req.body;
  const me = req.user.id;
  if (!seller_id || !rating) return res.status(400).json({ message: 'seller_id and rating required' });
  try {
    const existing = await pool.query('SELECT id FROM reviews WHERE buyer_id=$1 AND seller_id=$2', [me, seller_id]);
    if (existing.rows.length) {
      const r = await pool.query(
        'UPDATE reviews SET rating=$1, comment=$2, updated_at=NOW() WHERE buyer_id=$3 AND seller_id=$4 RETURNING *',
        [rating, comment, me, seller_id]
      );
      return res.json(r.rows[0]);
    }
    const r = await pool.query(
      'INSERT INTO reviews (buyer_id, seller_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *',
      [me, seller_id, rating, comment]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Coupons
const createCoupon = async (req, res) => {
  const { code, discount_percent, max_uses, expires_at } = req.body;
  const me = req.user.id;
  if (!code || !discount_percent) return res.status(400).json({ message: 'code and discount_percent required' });
  try {
    const r = await pool.query(
      `INSERT INTO coupons (seller_id, code, discount_percent, max_uses, expires_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [me, code.toUpperCase(), discount_percent, max_uses || null, expires_at || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: err.message });
  }
};

const getMyCoupons = async (req, res) => {
  const me = req.user.id;
  try {
    const r = await pool.query('SELECT * FROM coupons WHERE seller_id=$1 ORDER BY created_at DESC', [me]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const validateCoupon = async (req, res) => {
  const { code, painting_id } = req.body;
  try {
    const r = await pool.query(
      `SELECT c.*, u.name as seller_name FROM coupons c JOIN users u ON u.id=c.seller_id
       WHERE c.code=$1 AND c.is_active=TRUE
         AND (c.expires_at IS NULL OR c.expires_at > NOW())
         AND (c.max_uses IS NULL OR c.used_count < c.max_uses)`,
      [code.toUpperCase()]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Invalid or expired coupon' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteCoupon = async (req, res) => {
  const me = req.user.id;
  try {
    await pool.query('DELETE FROM coupons WHERE id=$1 AND seller_id=$2', [req.params.id, me]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Block user
const blockUser = async (req, res) => {
  const me = req.user.id;
  const { blocked_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [me, blocked_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Saved addresses
const saveAddress = async (req, res) => {
  const me = req.user.id;
  const { full_name, mobile, address, city, state, pincode, is_default } = req.body;
  try {
    if (is_default) await pool.query('UPDATE saved_addresses SET is_default=FALSE WHERE user_id=$1', [me]);
    const r = await pool.query(
      `INSERT INTO saved_addresses (user_id, full_name, mobile, address, city, state, pincode, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [me, full_name, mobile, address, city, state, pincode, is_default || false]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPublicProfile, updateProfile, getMyDashboard, addReview, createCoupon, getMyCoupons, validateCoupon, deleteCoupon, blockUser, saveAddress };
