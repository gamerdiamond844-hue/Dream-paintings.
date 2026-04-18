const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, trim: true, default: 'general' },
  message: { type: String, trim: true, required: true },
  payload: { type: Schema.Types.Mixed },
  link: { type: String, trim: true, default: '' },
  is_read: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }},
});

module.exports = mongoose.model('Notification', notificationSchema);
