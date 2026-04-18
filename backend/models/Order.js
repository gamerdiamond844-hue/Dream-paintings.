const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
  order_id: { type: String, required: true, unique: true, index: true },
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  painting: { type: Schema.Types.ObjectId, ref: 'Painting', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  payment_status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  payment_gateway: { type: String, trim: true, default: 'manual' },
  payment_proof: { type: String, trim: true, default: '' },
  payment_id: { type: String, trim: true, default: '' },
  payment_order_id: { type: String, trim: true, default: '' },
  payment_signature: { type: String, trim: true, default: '' },
  transaction_id: { type: String, trim: true, default: '' },
  full_name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  whatsapp: { type: String, trim: true, default: '' },
  alternate_contact: { type: String, trim: true, default: '' },
  email: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  rejection_reason: { type: String, trim: true, default: '' },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }},
});

module.exports = mongoose.model('Order', orderSchema);
