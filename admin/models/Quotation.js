const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  service: { type: String, required: true },
  details: { type: String, default: '' },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  refNo: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, default: '' },
  clientPhone: { type: String, default: '' },
  date: { type: String, default: '' },
  validTill: { type: String, default: '' },
  project: { type: String, default: 'Wedding Shoot' },
  items: { type: [itemSchema], default: [] },
  inclusions: { type: [String], default: [] },
  terms: { type: [String], default: [] },
  subtotal: { type: Number, default: 0 },
  advancePercent: { type: Number, default: 40 },
  advanceAmount: { type: Number, default: 0 },
  balancePayable: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Draft', 'Sent', 'Accepted', 'Completed', 'Cancelled'], 
    default: 'Sent' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quotation', quotationSchema);

