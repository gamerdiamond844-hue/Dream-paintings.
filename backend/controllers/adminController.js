const { pool } = require('../config/db');

const log = async (adminId, action, targetType, targetId, details) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
      [adminId, action, targetType, targetId, details]
    );
  } catch {}
};

const getStats = async (req, res) => {
  try {
    const [users, artists, paintings, sales, pending, revenue, comments, banned] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='user' AND (is_banned IS NULL OR is_banned=FALSE)"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='artist' AND (is_banned IS NULL OR is_banned=FALSE)"),
      pool.query("SELECT COUNT(*) FROM paintings WHERE status='approved' AND deleted_at IS NULL"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM paintings WHERE status='pending' AND deleted_at IS NULL"),
      pool.query("SELECT COALESCE(SUM(amount),0) as total FROM orders WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM comments"),
      pool.query("SELECT COUNT(*) FROM users WHERE is_banned=TRUE"),
    ]);
    const recentActivity = await pool.query(
      `SELECT al.*, u.name as admin_name FROM activity_logs al
       LEFT JOIN users u ON al.admin_id=u.id
       ORDER BY al.created_at DESC LIMIT 10`
    );
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalArtists: parseInt(artists.rows[0].count),
      totalPaintings: parseInt(paintings.rows[0].count),
      totalSales: parseInt(sales.rows[0].count),
      pendingApprovals: parseInt(pending.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalComments: parseInt(comments.rows[0].count),
      bannedUsers: parseInt(banned.rows[0].count),
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, u.is_banned,
        COALESCE(u.auth_provider, 'email') as auth_provider,
        COUNT(DISTINCT p.id) as painting_count,
        COUNT(DISTINCT s.id) as purchase_count
       FROM users u
       LEFT JOIN paintings p ON p.artist_id=u.id AND p.deleted_at IS NULL
       LEFT JOIN sales s ON s.user_id=u.id
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const u = await pool.query('SELECT name FROM users WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    await log(req.user.id, `Deleted user "${u.rows[0]?.name}"`, 'user', req.params.id, null);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const banUser = async (req, res) => {
  const { ban } = req.body;
  try {
    await pool.query('UPDATE users SET is_banned=$1 WHERE id=$2', [ban, req.params.id]);
    const u = await pool.query('SELECT name FROM users WHERE id=$1', [req.params.id]);
    await log(req.user.id, `${ban ? 'Banned' : 'Unbanned'} user "${u.rows[0]?.name}"`, 'user', req.params.id, null);
    res.json({ message: ban ? 'User banned' : 'User unbanned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const promoteUser = async (req, res) => {
  const { role } = req.body;
  if (!['user', 'artist', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  try {
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    const u = await pool.query('SELECT name FROM users WHERE id=$1', [req.params.id]);
    await log(req.user.id, `Changed role of "${u.rows[0]?.name}" to ${role}`, 'user', req.params.id, null);
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllPaintings = async (req, res) => {
  const { status, search, category, page = 1, limit = 20, sort = 'newest', include_deleted } = req.query;
  const offset = (page - 1) * limit;
  let where = include_deleted === 'true' ? [] : ['p.deleted_at IS NULL'];
  const params = [];
  let idx = 1;
  if (status) { where.push(`p.status=$${idx++}`); params.push(status); }
  if (category) { where.push(`p.category=$${idx++}`); params.push(category); }
  if (search) { where.push(`(p.title ILIKE $${idx} OR u.name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const orderMap = { newest: 'p.created_at DESC', oldest: 'p.created_at ASC', price_high: 'p.price DESC', price_low: 'p.price ASC', views: 'p.views DESC' };
  const orderBy = orderMap[sort] || 'p.created_at DESC';
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as artist_name, u.email as artist_email,
        COUNT(DISTINCT l.user_id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE WHEN p.discount_percent > 0 AND (p.offer_end IS NULL OR p.offer_end > NOW())
             THEN ROUND(p.price * (1 - p.discount_percent/100), 2) ELSE p.price END as effective_price
       FROM paintings p
       LEFT JOIN users u ON p.artist_id=u.id
       LEFT JOIN likes l ON l.painting_id=p.id
       LEFT JOIN comments c ON c.painting_id=p.id
       ${whereStr}
       GROUP BY p.id, u.name, u.email
       ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM paintings p LEFT JOIN users u ON p.artist_id=u.id ${whereStr}`,
      params
    );
    res.json({ paintings: result.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPendingPaintings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name as artist_name, u.email as artist_email
      FROM paintings p JOIN users u ON p.artist_id=u.id
      WHERE p.status='pending' AND p.deleted_at IS NULL ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePaintingAdmin = async (req, res) => {
  const { price, discount_percent, offer_start, offer_end, is_featured, is_trending, status, admin_message, title, description, category } = req.body;
  try {
    const result = await pool.query(
      `UPDATE paintings SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        price=COALESCE($3,price), category=COALESCE($4,category),
        status=COALESCE($5,status), admin_message=COALESCE($6,admin_message),
        discount_percent=COALESCE($7,discount_percent),
        offer_start=COALESCE($8,offer_start), offer_end=COALESCE($9,offer_end),
        is_featured=COALESCE($10,is_featured), is_trending=COALESCE($11,is_trending)
       WHERE id=$12 RETURNING *`,
      [title, description, price, category, status, admin_message, discount_percent, offer_start, offer_end, is_featured, is_trending, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Not found' });
    const p = result.rows[0];
    if (status) {
      const msg = status === 'approved'
        ? `Your painting "${p.title}" has been approved! 🎉 It is now live in the gallery.`
        : `Your painting "${p.title}" was rejected. ${admin_message ? 'Reason: ' + admin_message : ''}`;
      await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [p.artist_id, msg]);
    }
    await log(req.user.id, `Updated painting "${p.title}"`, 'painting', p.id, JSON.stringify(req.body));
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const softDeletePainting = async (req, res) => {
  try {
    const p = await pool.query('SELECT title FROM paintings WHERE id=$1', [req.params.id]);
    await pool.query('UPDATE paintings SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    await log(req.user.id, `Soft-deleted painting "${p.rows[0]?.title}"`, 'painting', req.params.id, null);
    res.json({ message: 'Painting soft-deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const restorePainting = async (req, res) => {
  try {
    await pool.query('UPDATE paintings SET deleted_at=NULL WHERE id=$1', [req.params.id]);
    await log(req.user.id, `Restored painting id=${req.params.id}`, 'painting', req.params.id, null);
    res.json({ message: 'Painting restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkAction = async (req, res) => {
  const { ids, action, message } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });
  try {
    if (action === 'delete') {
      await pool.query('UPDATE paintings SET deleted_at=NOW() WHERE id=ANY($1)', [ids]);
    } else if (action === 'approve' || action === 'reject') {
      await pool.query('UPDATE paintings SET status=$1 WHERE id=ANY($2)', [action === 'approve' ? 'approved' : 'rejected', ids]);
      const paintings = await pool.query('SELECT id, title, artist_id FROM paintings WHERE id=ANY($1)', [ids]);
      await Promise.all(paintings.rows.map(p => {
        const msg = action === 'approve'
          ? `Your painting "${p.title}" has been approved! 🎉`
          : `Your painting "${p.title}" was rejected. ${message || ''}`;
        return pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [p.artist_id, msg]);
      }));
    } else if (action === 'feature') {
      await pool.query('UPDATE paintings SET is_featured=TRUE WHERE id=ANY($1)', [ids]);
    } else if (action === 'trending') {
      await pool.query('UPDATE paintings SET is_trending=TRUE WHERE id=ANY($1)', [ids]);
    }
    await log(req.user.id, `Bulk ${action} on ${ids.length} paintings`, 'painting', null, ids.join(','));
    res.json({ message: `Bulk ${action} done` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllComments = async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar_url, p.title as painting_title, p.id as painting_id
       FROM comments c
       JOIN users u ON c.user_id=u.id
       JOIN paintings p ON c.painting_id=p.id
       ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await pool.query('SELECT COUNT(*) FROM comments');
    res.json({ comments: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
    await log(req.user.id, `Deleted comment id=${req.params.id}`, 'comment', req.params.id, null);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.order_id, o.amount, o.status, o.created_at,
        u.name as buyer_name, p.title as painting_title, p.image_url,
        a.name as artist_name
      FROM orders o
      JOIN users u ON o.user_id=u.id
      JOIN paintings p ON o.painting_id=p.id
      LEFT JOIN users a ON p.artist_id=a.id
      ORDER BY o.created_at DESC
    `);
    const topPaintings = await pool.query(`
      SELECT p.id, p.title, p.image_url, COUNT(o.id) as sale_count, SUM(o.amount) as revenue
      FROM orders o JOIN paintings p ON o.painting_id=p.id
      WHERE o.status='approved'
      GROUP BY p.id ORDER BY sale_count DESC LIMIT 5
    `);
    const monthlySales = await pool.query(`
      SELECT DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count, SUM(amount) as revenue
      FROM orders WHERE status='approved'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `);
    res.json({ sales: result.rows, topPaintings: topPaintings.rows, monthlySales: monthlySales.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getActivityLogs = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as admin_name FROM activity_logs al
       LEFT JOIN users u ON al.admin_id=u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await pool.query('SELECT COUNT(*) FROM activity_logs');
    res.json({ logs: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendNotification = async (req, res) => {
  const { user_id, message, role } = req.body;
  if (!message) return res.status(400).json({ message: 'Message required' });
  try {
    let targets;
    if (user_id) {
      targets = [{ id: user_id }];
    } else if (role) {
      const r = await pool.query('SELECT id FROM users WHERE role=$1', [role]);
      targets = r.rows;
    } else {
      const r = await pool.query('SELECT id FROM users');
      targets = r.rows;
    }
    await Promise.all(targets.map(u =>
      pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [u.id, message])
    ));
    await log(req.user.id, `Sent notification to ${user_id ? `user ${user_id}` : role || 'all'}`, 'notification', null, message);
    res.json({ message: 'Notification sent', count: targets.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Homepage Editor ──────────────────────────────────────────────
const DEFAULT_SECTIONS = {
  featured_title: 'Curated Masterpieces',
  trending_title: 'Trending Now',
  artists_title: 'Master Artists',
  testimonials_title: 'What Artists Say',
  recent_title: 'Recent Launch',
  section_featured: true,
  section_trending: true,
  section_artists: true,
  section_testimonials: true,
  section_recent: true,
};

const getHomepageConfig = async (req, res) => {
  try {
    const rows = await pool.query('SELECT key, value FROM settings WHERE key LIKE $1', ['homepage_%']);
    const config = { ...DEFAULT_SECTIONS };
    rows.rows.forEach(r => {
      const k = r.key.replace('homepage_', '');
      config[k] = r.value === 'true' ? true : r.value === 'false' ? false : r.value;
    });
    res.json(config);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const saveHomepageConfig = async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(entries.map(([k, v]) =>
      pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [`homepage_${k}`, String(v)]
      )
    ));
    await log(req.user.id, 'Updated homepage config', 'settings', null, null);
    res.json({ message: 'Saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTestimonials = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createTestimonial = async (req, res) => {
  const { name, role, quote, avatar_url } = req.body;
  if (!name || !quote) return res.status(400).json({ message: 'Name and quote required' });
  try {
    const r = await pool.query(
      'INSERT INTO testimonials (name, role, quote, avatar_url) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, role, quote, avatar_url]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateTestimonial = async (req, res) => {
  const { name, role, quote, avatar_url, is_active, sort_order } = req.body;
  try {
    const r = await pool.query(
      `UPDATE testimonials SET
        name=COALESCE($1,name), role=COALESCE($2,role), quote=COALESCE($3,quote),
        avatar_url=COALESCE($4,avatar_url), is_active=COALESCE($5,is_active),
        sort_order=COALESCE($6,sort_order)
       WHERE id=$7 RETURNING *`,
      [name, role, quote, avatar_url, is_active, sort_order, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteTestimonial = async (req, res) => {
  try {
    await pool.query('DELETE FROM testimonials WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const setMasterArtist = async (req, res) => {
  const { is_master_artist } = req.body;
  try {
    await pool.query('UPDATE users SET is_master_artist=$1 WHERE id=$2', [is_master_artist, req.params.id]);
    await log(req.user.id, `${is_master_artist ? 'Set' : 'Removed'} master artist id=${req.params.id}`, 'user', req.params.id, null);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMasterArtists = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.bio, u.is_master_artist,
        COUNT(DISTINCT p.id) as painting_count
       FROM users u
       LEFT JOIN paintings p ON p.artist_id=u.id AND p.status='approved' AND p.deleted_at IS NULL
       WHERE u.role='artist'
       GROUP BY u.id ORDER BY u.name`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Public homepage data endpoint
const getPublicHomepageData = async (req, res) => {
  try {
    const [configRows, featured, trending, recent, artists, testimonials, stats] = await Promise.all([
      pool.query('SELECT key, value FROM settings WHERE key LIKE $1', ['homepage_%']),
      pool.query(
        `SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
          u.is_verified as artist_is_verified, u.badge_level as artist_badge_level,
          COUNT(DISTINCT l.user_id) as likes_count
         FROM paintings p LEFT JOIN users u ON p.artist_id=u.id
         LEFT JOIN likes l ON l.painting_id=p.id
         WHERE p.is_featured=TRUE AND p.status='approved' AND p.deleted_at IS NULL
         GROUP BY p.id, u.name, u.avatar_url, u.is_verified, u.badge_level ORDER BY p.created_at DESC LIMIT 6`
      ),
      pool.query(
        `SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
          u.is_verified as artist_is_verified, u.badge_level as artist_badge_level,
          COUNT(DISTINCT l.user_id) as likes_count
         FROM paintings p LEFT JOIN users u ON p.artist_id=u.id
         LEFT JOIN likes l ON l.painting_id=p.id
         WHERE (p.is_trending=TRUE OR p.status='approved') AND p.status='approved' AND p.deleted_at IS NULL
         GROUP BY p.id, u.name, u.avatar_url, u.is_verified, u.badge_level
         ORDER BY p.is_trending DESC, likes_count DESC LIMIT 8`
      ),
      pool.query(
        `SELECT p.*, u.name as artist_name, u.avatar_url as artist_avatar,
          u.is_verified as artist_is_verified, u.badge_level as artist_badge_level,
          COUNT(DISTINCT l.user_id) as likes_count
         FROM paintings p LEFT JOIN users u ON p.artist_id=u.id
         LEFT JOIN likes l ON l.painting_id=p.id
         WHERE p.status='approved' AND p.deleted_at IS NULL
         GROUP BY p.id, u.name, u.avatar_url, u.is_verified, u.badge_level ORDER BY p.created_at DESC LIMIT 6`
      ),
      pool.query(
        `SELECT u.id, u.name, u.avatar_url, u.bio,
          COUNT(DISTINCT p.id) as painting_count
         FROM users u
         LEFT JOIN paintings p ON p.artist_id=u.id AND p.status='approved' AND p.deleted_at IS NULL
         WHERE u.is_master_artist=TRUE
         GROUP BY u.id ORDER BY u.name`
      ),
      pool.query('SELECT * FROM testimonials WHERE is_active=TRUE ORDER BY sort_order ASC, created_at DESC'),
      Promise.all([
        pool.query("SELECT COUNT(*) FROM users WHERE is_banned IS NULL OR is_banned=FALSE"),
        pool.query("SELECT COUNT(*) FROM paintings WHERE status='approved' AND deleted_at IS NULL"),
        pool.query("SELECT COUNT(*) FROM users WHERE role='artist' AND (is_banned IS NULL OR is_banned=FALSE)"),
        pool.query("SELECT COUNT(*) FROM sales WHERE status='completed'"),
      ])
    ]);

    const config = { ...DEFAULT_SECTIONS };
    configRows.rows.forEach(r => {
      const k = r.key.replace('homepage_', '');
      config[k] = r.value === 'true' ? true : r.value === 'false' ? false : r.value;
    });

    res.json({
      config,
      featured: featured.rows,
      trending: trending.rows,
      recent: recent.rows,
      artists: artists.rows,
      testimonials: testimonials.rows,
      stats: {
        totalUsers: parseInt(stats[0].rows[0].count),
        totalPaintings: parseInt(stats[1].rows[0].count),
        totalArtists: parseInt(stats[2].rows[0].count),
        totalSales: parseInt(stats[3].rows[0].count),
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const toggleGoogleAuth = async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('google_auth_enabled', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [enabled ? 'true' : 'false']
    );
    // Reflect in runtime env so the auth controller picks it up immediately
    process.env.GOOGLE_AUTH_ENABLED = enabled ? 'true' : 'false';
    await log(req.user.id, `${enabled ? 'Enabled' : 'Disabled'} Google login`, 'settings', null, null);
    res.json({ message: `Google login ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getStats, getAllUsers, deleteUser, banUser, promoteUser,
  getAllPaintings, getPendingPaintings, updatePaintingAdmin, softDeletePainting, restorePainting, bulkAction,
  getAllComments, deleteComment,
  getSales, getActivityLogs,
  sendNotification, getNotifications, markNotificationsRead,
  getHomepageConfig, saveHomepageConfig,
  getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  setMasterArtist, getMasterArtists,
  getPublicHomepageData,
  toggleGoogleAuth,
};
