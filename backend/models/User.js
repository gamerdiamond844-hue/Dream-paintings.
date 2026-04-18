const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
  full_name: { type: String, trim: true },
  mobile: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  alternate_contact: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  landmark: { type: String, trim: true },
  is_default: { type: Boolean, default: false },
}, { _id: false, timestamps: false });

const userSchema = new Schema({
  name: { type: String, trim: true, required: true },
  email: { type: String, trim: true, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'artist', 'admin'], default: 'user' },
  avatar_url: { type: String, trim: true, default: '' },
  cover_url: { type: String, trim: true, default: '' },
  bio: { type: String, trim: true, default: '' },
  instagram: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  is_master_artist: { type: Boolean, default: false },
  is_banned: { type: Boolean, default: false },
  blocked: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  addresses: [addressSchema],
  last_seen: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }},
  toObject: { virtuals: true },
});

module.exports = mongoose.model('User', userSchema);
