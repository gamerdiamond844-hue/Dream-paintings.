const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, trim: true, default: '' },
  message_type: { type: String, enum: ['text', 'image', 'offer'], default: 'text' },
  offer_amount: { type: Number, min: 0 },
  offer_status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered'], default: 'pending' },
  image_url: { type: String, trim: true, default: '' },
  is_read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }},
});

messageSchema.index({ conversation: 1, createdAt: 1 });
module.exports = mongoose.model('Message', messageSchema);
