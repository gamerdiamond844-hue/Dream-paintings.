const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  participant_pair: { type: String, required: true, index: true, unique: true },
  painting: { type: Schema.Types.ObjectId, ref: 'Painting' },
  is_flagged: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }},
});

conversationSchema.pre('validate', function(next) {
  if (this.participants?.length === 2) {
    const ids = this.participants.map(id => id.toString()).sort();
    this.participant_pair = ids.join('_');
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
