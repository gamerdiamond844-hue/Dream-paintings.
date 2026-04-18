require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { initDB } = require('./config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    if (
      allowedOrigins.includes(origin) ||
      /\.ngrok-free\.app$/.test(origin) ||
      /\.ngrok\.io$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(null, true); // permissive for dev; tighten in production
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io instance to every request so controllers can emit
app.use((req, _, next) => { req.io = io; next(); });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/paintings', require('./routes/paintings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/withdrawals', require('./routes/withdrawals'));

const { getPublicHomepageData } = require('./controllers/adminController');
app.get('/api/homepage', getPublicHomepageData);
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Socket.IO ───────────────────────────────────────────────────────────────
// Security: every socket must present a valid JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Track online users: userId -> Set of socketIds (multi-tab support)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = Number(socket.user.id);

  // Join personal room — used for targeted notifications
  socket.join(`user_${userId}`);

  // Track online presence
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // Notify others this user is online (emit only to connected users, not globally)
  socket.broadcast.emit('user_online', { userId, online: true });

  // Send current online user IDs to this socket only
  socket.emit('online_users', Array.from(onlineUsers.keys()));

  // ── Join a conversation room (only participants should call this) ──────────
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // ── Typing indicator — emitted only within conversation room ──────────────
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`conv_${conversationId}`).emit('typing', { userId, isTyping });
  });

  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  // All call events are routed to the target user's personal room so they
  // arrive regardless of which conversation room they have joined.

  socket.on('call_user', ({ targetUserId, offer, callerName, callerAvatar, callType }) => {
    socket.to(`user_${targetUserId}`).emit('incoming_call', {
      callerId: userId,
      callerName,
      callerAvatar,
      callType: callType || 'voice',
      offer,
    });
  });

  socket.on('call_answer', ({ targetUserId, answer }) => {
    socket.to(`user_${targetUserId}`).emit('call_answered', { answer });
  });

  socket.on('call_reject', ({ targetUserId }) => {
    socket.to(`user_${targetUserId}`).emit('call_rejected');
  });

  socket.on('ice_candidate', ({ targetUserId, candidate }) => {
    socket.to(`user_${targetUserId}`).emit('ice_candidate', { candidate });
  });

  socket.on('call_end', ({ targetUserId }) => {
    socket.to(`user_${targetUserId}`).emit('call_ended');
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        // Only broadcast offline when ALL tabs are closed
        socket.broadcast.emit('user_online', { userId, online: false });
      }
    }
  });
});

// Export io so it can be used in tests or other modules if needed
module.exports = { io };

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
