const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'withdraw', 'withdrawal', 'prize_payout', 'tournament_fee'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
});

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    transactions: [WalletTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', WalletSchema);
