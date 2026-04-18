const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const paintingStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/paintings', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/avatars', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/payment-proofs', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] },
});

const qrStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/qr-codes', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const uploadPainting = multer({ storage: paintingStorage });
const uploadAvatar = multer({ storage: avatarStorage });
const uploadPaymentProof = multer({ storage: paymentProofStorage });
const uploadQR = multer({ storage: qrStorage });

const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/covers', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const chatImageStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/chat-images', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const verificationDocStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/verification-docs', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] },
});

const badgePaymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'dream-paintings/badge-payment-proofs', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const uploadCover = multer({ storage: coverStorage });
const uploadChatImage = multer({ storage: chatImageStorage });
const uploadVerificationDoc = multer({ storage: verificationDocStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadBadgePaymentProof = multer({ storage: badgePaymentProofStorage, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { cloudinary, uploadPainting, uploadAvatar, uploadPaymentProof, uploadQR, uploadCover, uploadChatImage, uploadVerificationDoc, uploadBadgePaymentProof, avatarUpload: avatarStorage, coverUpload: coverStorage };
