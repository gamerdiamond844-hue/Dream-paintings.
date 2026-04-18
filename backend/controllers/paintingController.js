const { pool } = require('../config/db');

const getPaintings = async (req, res) => {
  const { search, category, status = 'approved', page = 1, limit = 12, featured, sort } = req.query;
  const offset = (page - 1) * limit;
  let query = `
    SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
      u.is_verified as artist_is_verified, u.badge_level as artist_badge_level,
      COUNT(DISTINCT l.user_id) as likes_count,
      COUNT(DISTINCT c.id) as comments_count
    FROM paintings p
    LEFT JOIN users u ON p.artist_id = u.id
    LEFT JOIN likes l ON l.painting_id = p.id
    LEFT JOIN comments c ON c.painting_id = p.id
    WHERE p.status = $1 AND p.deleted_at IS NULL
  `;
  const params = [status];
  let idx = 2;
  if (search) { query += ` AND (p.title ILIKE $${idx} OR u.name ILIKE $${idx} OR p.category ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
  if (category) { query += ` AND p.category = $${idx}`; params.push(category); idx++; }
  if (featured === 'true') { query += ` AND p.is_featured = TRUE`; }
  const orderBy = sort === 'trending' ? 'p.is_trending DESC, likes_count DESC' : 'p.created_at DESC';
  query += ` GROUP BY p.id, u.name, u.avatar_url, u.is_verified, u.badge_level ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);
  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM paintings p LEFT JOIN users u ON p.artist_id=u.id WHERE p.status=$1${search ? ` AND (p.title ILIKE $2 OR u.name ILIKE $2 OR p.category ILIKE $2)` : ''}`,
      search ? [status, `%${search}%`] : [status]
    );
    res.json({ paintings: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPainting = async (req, res) => {
  try {
    await pool.query('UPDATE paintings SET views = views + 1 WHERE id=$1', [req.params.id]);
    const result = await pool.query(`
      SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar, u.bio as artist_bio,
        u.is_verified as artist_is_verified, u.badge_level as artist_badge_level,
        COALESCE(COUNT(DISTINCT l.user_id), 0) as likes_count
      FROM paintings p
      LEFT JOIN users u ON p.artist_id = u.id
      LEFT JOIN likes l ON l.painting_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u.name, u.avatar_url, u.bio, u.is_verified, u.badge_level
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Painting not found' });

    // Check if requesting user has liked this painting
    let userLiked = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const likeCheck = await pool.query('SELECT 1 FROM likes WHERE user_id=$1 AND painting_id=$2', [decoded.id, req.params.id]);
        userLiked = likeCheck.rows.length > 0;
      } catch {}
    }

    res.json({ ...result.rows[0], user_liked: userLiked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createPainting = async (req, res) => {
  const { title, description, price, category } = req.body;
  const image_url = req.file?.path;
  if (!image_url) return res.status(400).json({ message: 'Image required' });
  try {
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    const result = await pool.query(
      'INSERT INTO paintings (title, description, image_url, price, category, artist_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [title, description, image_url, price, category, req.user.id, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePainting = async (req, res) => {
  const { title, description, price, category, status, admin_message } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM paintings WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Not found' });
    const p = existing.rows[0];
    if (req.user.role !== 'admin' && p.artist_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    const result = await pool.query(
      `UPDATE paintings SET title=COALESCE($1,title), description=COALESCE($2,description),
       price=COALESCE($3,price), category=COALESCE($4,category),
       status=COALESCE($5,status), admin_message=COALESCE($6,admin_message)
       WHERE id=$7 RETURNING *`,
      [title, description, price, category, status, admin_message, req.params.id]
    );
    if (status && status !== p.status) {
      const msg = status === 'approved'
        ? `Your painting "${p.title}" has been approved! 🎉 It is now live in the gallery.`
        : `Your painting "${p.title}" was rejected. ${admin_message ? 'Reason: ' + admin_message : ''}`;
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [p.artist_id, msg]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deletePainting = async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM paintings WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].artist_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    await pool.query('DELETE FROM paintings WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleLike = async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await pool.query('SELECT 1 FROM likes WHERE user_id=$1 AND painting_id=$2', [req.user.id, id]);
    if (exists.rows.length) {
      await pool.query('DELETE FROM likes WHERE user_id=$1 AND painting_id=$2', [req.user.id, id]);
      const count = await pool.query('SELECT COUNT(*) FROM likes WHERE painting_id=$1', [id]);
      res.json({ liked: false, likes_count: parseInt(count.rows[0].count) });
    } else {
      await pool.query('INSERT INTO likes (user_id, painting_id) VALUES ($1,$2)', [req.user.id, id]);
      const count = await pool.query('SELECT COUNT(*) FROM likes WHERE painting_id=$1', [id]);
      res.json({ liked: true, likes_count: parseInt(count.rows[0].count) });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getComments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, c.painting_id, c.text, c.created_at, u.name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id=u.id
       WHERE c.painting_id=$1 ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addComment = async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
  try {
    const inserted = await pool.query(
      'INSERT INTO comments (user_id, painting_id, text) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, req.params.id, text.trim()]
    );
    const full = await pool.query(
      'SELECT c.*, u.name, u.avatar_url FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=$1',
      [inserted.rows[0].id]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM comments WHERE id=$1', [req.params.commentId]);
    if (!result.rows.length) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'admin' && result.rows[0].user_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.commentId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getArtistPaintings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
        COALESCE(COUNT(DISTINCT l.user_id), 0) as likes_count
       FROM paintings p
       LEFT JOIN users u ON p.artist_id = u.id
       LEFT JOIN likes l ON l.painting_id=p.id
       WHERE p.artist_id=$1
       GROUP BY p.id, u.name, u.avatar_url ORDER BY p.created_at DESC`,
      [req.params.artistId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const purchasePainting = async (req, res) => {
  const { id } = req.params;
  try {
    const painting = await pool.query('SELECT * FROM paintings WHERE id=$1 AND status=$2', [id, 'approved']);
    if (!painting.rows.length) return res.status(404).json({ message: 'Painting not available' });
    const p = painting.rows[0];

    // Check if already purchased
    const alreadyBought = await pool.query(
      'SELECT 1 FROM sales WHERE user_id=$1 AND painting_id=$2 AND status=$3',
      [req.user.id, id, 'completed']
    );
    if (alreadyBought.rows.length) return res.status(400).json({ message: 'You already purchased this painting' });

    const sale = await pool.query(
      'INSERT INTO sales (user_id, painting_id, amount, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, id, p.price, 'completed']
    );

    // Notify buyer
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [
      req.user.id,
      `🎨 Purchase confirmed! You bought "${p.title}" for ₹${parseFloat(p.price).toLocaleString()}.`
    ]);

    // Notify artist
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [
      p.artist_id,
      `💰 Your painting "${p.title}" was purchased for ₹${parseFloat(p.price).toLocaleString()}!`
    ]);

    res.status(201).json({ message: 'Purchase successful', sale: sale.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPaintings, getPainting, createPainting, updatePainting, deletePainting, toggleLike, getComments, addComment, deleteComment, getArtistPaintings, purchasePainting };
