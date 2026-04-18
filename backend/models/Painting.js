const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  avatar_url: { type: String, default: '' },
  text: { type: String, required: true, trim: true },
  created_at: { type: Date, default: Date.now },
}, { _id: true });

const paintingSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  image_url: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, trim: true, default: '' },
  artist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'sold'], default: 'pending' },
  admin_message: { type: String, trim: true, default: '' },
  views: { type: Number, default: 0 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  is_featured: { type: Boolean, default: false },
  is_trending: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  discount_percent: { type: Number, min: 0, max: 100, default: 0 },
  offer_start: { type: Date },
  offer_end: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.likes_count = ret.likes?.length || 0;
    delete ret._id;
    delete ret.__v;
    return ret;
  }},
});

paintingSchema.index({ artist: 1, status: 1, deleted: 1 });
module.exports = mongoose.model('Painting', paintingSchema);
