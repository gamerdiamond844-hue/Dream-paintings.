const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadPainting } = require('../config/cloudinary');
const {
  getPaintings, getPainting, createPainting, updatePainting, deletePainting,
  toggleLike, getComments, addComment, deleteComment, getArtistPaintings, purchasePainting
} = require('../controllers/paintingController');

router.get('/', getPaintings);
router.get('/artist/:artistId', getArtistPaintings);
router.get('/:id', getPainting);
router.post('/', auth, requireRole('artist', 'admin'), uploadPainting.single('image'), createPainting);
router.put('/:id', auth, updatePainting);
router.delete('/:id', auth, deletePainting);
router.post('/:id/like', auth, toggleLike);
router.get('/:id/comments', getComments);
router.post('/:id/comments', auth, addComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);
router.post('/:id/purchase', auth, purchasePainting);

module.exports = router;
