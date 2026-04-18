const { pool } = require('../config/db');

// ─── helpers ────────────────────────────────────────────────────────────────

const isParticipant = (conv, userId) =>
  Number(conv.user1_id) === Number(userId) || Number(conv.user2_id) === Number(userId);

const logAdminAction = async (adminId, action, targetId, details) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1,$2,'conversation',$3,$4)`,
      [adminId, action, targetId, details]
    );
  } catch (_) {}
};

// Simple in-memory rate limiter: max 30 messages / 60s per user
const msgRateMap = new Map();
const isRateLimited = (userId) => {
  const now = Date.now();
  const entry = msgRateMap.get(userId) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  msgRateMap.set(userId, entry);
  return entry.count > 30;
};

// ─── conversations ───────────────────────────────────────────────────────────

const getOrCreateConversation = async (req, res) => {
  const { other_user_id, painting_id } = req.body;
  const me = req.user.id;

  if (!other_user_id || Number(other_user_id) === Number(me))
    return res.status(400).json({ message: 'Invalid recipient' });

  try {
    // Check if either user has blocked the other
    const blocked = await pool.query(
      `SELECT 1 FROM user_blocks
       WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)`,
      [me, other_user_id]
    );
    if (blocked.rows.length)
      return res.status(403).json({ message: 'Cannot start conversation — user is blocked' });

    // Check other user exists and is not banned
    const other = await pool.query(
      'SELECT id, name, role FROM users WHERE id=$1 AND is_banned=FALSE',
      [other_user_id]
    );
    if (!other.rows.length)
      return res.status(404).json({ message: 'User not found' });

    let conv = await pool.query(
      `SELECT * FROM conversations
       WHERE (user1_id=$1 AND user2_id=$2) OR (user1_id=$2 AND user2_id=$1)
       LIMIT 1`,
      [me, other_user_id]
    );

    if (!conv.rows.length) {
      conv = await pool.query(
        `INSERT INTO conversations (user1_id, user2_id, painting_id)
         VALUES ($1,$2,$3) RETURNING *`,
        [me, other_user_id, painting_id || null]
      );
    } else if (painting_id && !conv.rows[0].painting_id) {
      await pool.query(
        'UPDATE conversations SET painting_id=$1 WHERE id=$2',
        [painting_id, conv.rows[0].id]
      );
    }

    const convId = conv.rows[0].id;
    const full = await pool.query(
      `SELECT c.*,
         u1.name AS user1_name, u1.avatar_url AS user1_avatar, u1.role AS user1_role,
         u2.name AS user2_name, u2.avatar_url AS user2_avatar, u2.role AS user2_role,
         p.title AS painting_title, p.image_url AS painting_image, p.price AS painting_price
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       LEFT JOIN paintings p ON p.id = c.painting_id
       WHERE c.id = $1`,
      [convId]
    );
    res.json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyConversations = async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(
      `SELECT c.*,
         u1.name AS user1_name, u1.avatar_url AS user1_avatar, u1.role AS user1_role,
         u2.name AS user2_name, u2.avatar_url AS user2_avatar, u2.role AS user2_role,
         p.title AS painting_title, p.image_url AS painting_image, p.price AS painting_price,
         (SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id AND m.receiver_id = $1 AND m.is_read = FALSE
         ) AS unread_count,
         (SELECT row_to_json(lm) FROM (
           SELECT m.id, m.message, m.message_type, m.created_at, m.sender_id, m.image_url
           FROM messages m WHERE m.conversation_id = c.id
           ORDER BY m.created_at DESC LIMIT 1
         ) lm) AS last_message
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       LEFT JOIN paintings p ON p.id = c.painting_id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.updated_at DESC`,
      [me]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const me = req.user.id;
  const isAdmin = req.user.role === 'admin';

  try {
    const conv = await pool.query('SELECT * FROM conversations WHERE id=$1', [conversationId]);
    if (!conv.rows.length) return res.status(404).json({ message: 'Conversation not found' });

    // Strict privacy: only participants OR admin
    if (!isAdmin && !isParticipant(conv.rows[0], me))
      return res.status(403).json({ message: 'Access denied — private conversation' });

    // Admin audit log
    if (isAdmin) await logAdminAction(me, 'VIEW_CONVERSATION', conversationId, `Admin viewed conversation ${conversationId}`);

    // Mark messages as read (only for actual participant, not admin)
    if (!isAdmin) {
      await pool.query(
        'UPDATE messages SET is_read=TRUE WHERE conversation_id=$1 AND receiver_id=$2 AND is_read=FALSE',
        [conversationId, me]
      );
      // Emit seen event via socket (attached to req by server.js)
      if (req.io) {
        req.io.to(`conv_${conversationId}`).emit('messages_seen', { conversationId, userId: me });
      }
    }

    const result = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
              u.is_verified AS sender_is_verified, u.badge_level AS sender_badge_level
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const me = req.user.id;
  const { message, message_type = 'text', offer_amount, image_url } = req.body;

  if (!message?.trim() && !image_url && !offer_amount)
    return res.status(400).json({ message: 'Message content required' });

  if (isRateLimited(me))
    return res.status(429).json({ message: 'Too many messages. Please slow down.' });

  try {
    const conv = await pool.query('SELECT * FROM conversations WHERE id=$1', [conversationId]);
    if (!conv.rows.length) return res.status(404).json({ message: 'Conversation not found' });

    // Only participants can send — admins cannot inject messages
    if (!isParticipant(conv.rows[0], me))
      return res.status(403).json({ message: 'Access denied — not a participant' });

    // Check block
    const receiver_id = Number(conv.rows[0].user1_id) === Number(me)
      ? conv.rows[0].user2_id : conv.rows[0].user1_id;

    const blocked = await pool.query(
      `SELECT 1 FROM user_blocks
       WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)`,
      [me, receiver_id]
    );
    if (blocked.rows.length)
      return res.status(403).json({ message: 'Cannot send message — user is blocked' });

    const result = await pool.query(
      `INSERT INTO messages
         (conversation_id, sender_id, receiver_id, message, message_type, offer_amount, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [conversationId, me, receiver_id,
       message?.trim() || null, message_type,
       offer_amount || null, image_url || null]
    );

    await pool.query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [conversationId]);

    const full = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
              u.is_verified AS sender_is_verified, u.badge_level AS sender_badge_level
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
      [result.rows[0].id]
    );

    const msg = full.rows[0];

    // Emit via Socket.IO — ONLY to conversation room (participants only)
    if (req.io) {
      req.io.to(`conv_${conversationId}`).emit('new_message', msg);
      // Ping receiver's personal room for notification badge
      req.io.to(`user_${receiver_id}`).emit('message_notification', {
        conversationId: Number(conversationId),
        message: msg,
      });
    }

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const respondToOffer = async (req, res) => {
  const { messageId } = req.params;
  const { status, counter_amount } = req.body;
  const me = req.user.id;

  if (!['accepted', 'rejected', 'countered'].includes(status))
    return res.status(400).json({ message: 'Invalid offer status' });

  try {
    const msg = await pool.query(
      `SELECT m.*, c.user1_id, c.user2_id, c.id AS conv_id
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE m.id=$1 AND m.receiver_id=$2 AND m.message_type='offer'`,
      [messageId, me]
    );
    if (!msg.rows.length) return res.status(404).json({ message: 'Offer not found' });

    await pool.query('UPDATE messages SET offer_status=$1 WHERE id=$2', [status, messageId]);

    let counterMsg = null;
    if (status === 'countered' && counter_amount) {
      const r = await pool.query(
        `INSERT INTO messages
           (conversation_id, sender_id, receiver_id, message, message_type, offer_amount)
         VALUES ($1,$2,$3,$4,'offer',$5) RETURNING *`,
        [msg.rows[0].conv_id, me, msg.rows[0].sender_id,
         `Counter offer: ₹${counter_amount}`, counter_amount]
      );
      await pool.query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [msg.rows[0].conv_id]);
      const full = await pool.query(
        `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1`,
        [r.rows[0].id]
      );
      counterMsg = full.rows[0];
    }

    if (req.io) {
      req.io.to(`conv_${msg.rows[0].conv_id}`).emit('offer_updated', {
        messageId: Number(messageId), status, counterMsg,
      });
    }

    res.json({ success: true, counterMsg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const me = req.user.id;
  try {
    const msg = await pool.query(
      'SELECT * FROM messages WHERE id=$1 AND sender_id=$2',
      [messageId, me]
    );
    if (!msg.rows.length) return res.status(403).json({ message: 'Cannot delete this message' });

    await pool.query('UPDATE messages SET message=NULL, image_url=NULL, deleted=TRUE WHERE id=$1', [messageId]);

    if (req.io) {
      req.io.to(`conv_${msg.rows[0].conversation_id}`).emit('message_deleted', { messageId: Number(messageId) });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTotalUnread = async (req, res) => {
  const me = req.user.id;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=FALSE',
      [me]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const flagConversation = async (req, res) => {
  const { conversationId } = req.params;
  const me = req.user.id;
  try {
    const conv = await pool.query('SELECT * FROM conversations WHERE id=$1', [conversationId]);
    if (!conv.rows.length) return res.status(404).json({ message: 'Not found' });
    if (!isParticipant(conv.rows[0], me))
      return res.status(403).json({ message: 'Access denied' });

    await pool.query('UPDATE conversations SET is_flagged=TRUE WHERE id=$1', [conversationId]);
    await logAdminAction(null, 'CONVERSATION_FLAGGED', conversationId, `Flagged by user ${me}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── admin-only ──────────────────────────────────────────────────────────────

const adminGetAllConversations = async (req, res) => {
  const { flagged, search, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (flagged === 'true') { where += ` AND c.is_flagged=TRUE`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u1.name ILIKE $${params.length} OR u2.name ILIKE $${params.length})`;
    }
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT c.*,
         u1.name AS user1_name, u1.avatar_url AS user1_avatar,
         u2.name AS user2_name, u2.avatar_url AS user2_avatar,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id) AS message_count,
         (SELECT row_to_json(lm) FROM (
           SELECT m.id, m.message, m.created_at, m.sender_id
           FROM messages m WHERE m.conversation_id=c.id
           ORDER BY m.created_at DESC LIMIT 1
         ) lm) AS last_message
       FROM conversations c
       JOIN users u1 ON u1.id=c.user1_id
       JOIN users u2 ON u2.id=c.user2_id
       ${where}
       ORDER BY c.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    await logAdminAction(req.user.id, 'ADMIN_LIST_CONVERSATIONS', null, `Admin listed conversations`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const adminGetConversationMessages = async (req, res) => {
  const { conversationId } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
      [conversationId]
    );
    await logAdminAction(req.user.id, 'ADMIN_VIEW_MESSAGES', conversationId,
      `Admin read conversation ${conversationId}`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const adminUnflagConversation = async (req, res) => {
  const { conversationId } = req.params;
  try {
    await pool.query('UPDATE conversations SET is_flagged=FALSE WHERE id=$1', [conversationId]);
    await logAdminAction(req.user.id, 'ADMIN_UNFLAG_CONVERSATION', conversationId, '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getOrCreateConversation, getMyConversations, getMessages,
  sendMessage, respondToOffer, deleteMessage, getTotalUnread,
  flagConversation,
  adminGetAllConversations, adminGetConversationMessages, adminUnflagConversation,
};
