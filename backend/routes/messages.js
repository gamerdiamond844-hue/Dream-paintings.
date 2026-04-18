const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadChatImage } = require('../config/cloudinary');
const {
  getOrCreateConversation, getMyConversations, getMessages,
  sendMessage, respondToOffer, deleteMessage, getTotalUnread,
  flagConversation,
  adminGetAllConversations, adminGetConversationMessages, adminUnflagConversation,
} = require('../controllers/messageController');

router.use(auth);

router.get('/unread', getTotalUnread);
router.get('/conversations', getMyConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:conversationId', getMessages);
router.post('/conversations/:conversationId', sendMessage);
router.post('/conversations/:conversationId/flag', flagConversation);
router.put('/messages/:messageId/offer', respondToOffer);
router.delete('/messages/:messageId', deleteMessage);

// Chat image upload — returns { url } for use in sendMessage
router.post('/upload-image', uploadChatImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image provided' });
  res.json({ url: req.file.path });
});

// Admin-only (read-only moderation)
router.get('/admin/conversations', requireRole('admin'), adminGetAllConversations);
router.get('/admin/conversations/:conversationId', requireRole('admin'), adminGetConversationMessages);
router.put('/admin/conversations/:conversationId/unflag', requireRole('admin'), adminUnflagConversation);

module.exports = router;
