const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  createWalletDepositOrder,
  verifyWalletDeposit,
  payWithWallet,
  initiateRazorpayWithdrawal,
  quickTopUpWallet,
  fundTournamentPrizePool,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect); // All payment routes require authentication

router.post('/order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.post('/wallet-order', createWalletDepositOrder);
router.post('/verify-wallet-deposit', verifyWalletDeposit);
router.post('/pay-with-wallet', payWithWallet);
router.post('/initiate-withdrawal', initiateRazorpayWithdrawal);
router.post('/quick-topup', quickTopUpWallet);
router.post('/fund-prize-pool', fundTournamentPrizePool);

module.exports = router;
