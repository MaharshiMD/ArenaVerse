const mongoose = require('mongoose');

const MerchItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['jersey', 'hoodie', 'mousepad', 'overlay', 'graphics', 'digital_asset', 'hardware', 'custom'],
      default: 'jersey',
    },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    stock: { type: Number, default: 50, min: 0 },
    itemType: { type: String, enum: ['physical', 'digital'], default: 'physical' },
    digitalFileUrl: { type: String, default: '' },
    seller: { type: String, default: 'ArenaVerse Official' },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MerchItem', MerchItemSchema);
