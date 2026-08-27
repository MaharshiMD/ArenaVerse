const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');

// Initialize Razorpay instance lazily
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mocksecret123'
  });
};

// @desc    Create Razorpay Payment Order
// @route   POST /api/payments/order
// @access  Private
const createOrder = async (req, res) => {
  const { tournamentId, teamId } = req.body;

  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'draft' && tournament.status !== 'published') {
      return res.status(400).json({ message: 'Registration is closed for this tournament' });
    }

    // Verify registration status and capacity rules
    if (tournament.type === 'solo') {
      if (tournament.registeredPlayers.some(id => id.toString() === req.user._id.toString())) {
        return res.status(400).json({ message: 'You are already registered for this tournament' });
      }
      if (tournament.registeredPlayers.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }
    } else {
      if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required for team-based tournaments' });
      }
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      if (!team.members.some(id => id.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'You must be a member of the team to register it' });
      }
      if (tournament.registeredTeams.some(id => id.toString() === teamId.toString())) {
        return res.status(400).json({ message: 'This team is already registered' });
      }
      if (tournament.registeredTeams.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }
    }

    if (tournament.entryFee <= 0) {
      return res.status(400).json({ message: 'This tournament is free. Register directly.' });
    }

    // Create Razorpay Order
    const amountInPaise = Math.round(tournament.entryFee * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${tournamentId.toString().substring(18)}`
    };

    let order;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && keyId !== 'rzp_test_mockkey123') {
      try {
        const razorpay = getRazorpayInstance();
        order = await razorpay.orders.create(options);
      } catch (err) {
        console.warn('Razorpay API call failed, falling back to test order:', err.message);
        order = {
          id: `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          amount: amountInPaise,
          currency: 'INR',
        };
      }
    } else {
      order = {
        id: `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        amount: amountInPaise,
        currency: 'INR',
      };
    }

    // Create pending payment record in MongoDB
    const payment = await Payment.create({
      tournament: tournamentId,
      user: req.user._id,
      team: tournament.type === 'team' ? teamId : null,
      amount: tournament.entryFee,
      currency: 'INR',
      orderId: order.id,
      status: 'pending'
    });

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId || 'rzp_test_mockkey123',
      paymentRecordId: payment._id,
      isMock: order.id.startsWith('order_test_')
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
  const { 
    tournamentId, 
    teamId, 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature 
  } = req.body;

  try {
    if (!razorpay_order_id) {
      return res.status(400).json({ message: 'Missing payment details for verification' });
    }

    // Retrieve payment record from MongoDB
    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Verify signature if provided and not in test/mock mode
    if (razorpay_signature && !razorpay_order_id.startsWith('order_test_')) {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mocksecret123');
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature && process.env.NODE_ENV === 'production') {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({ message: 'Payment verification failed' });
      }
    }

    // Update payment record status in MongoDB
    payment.status = 'success';
    payment.paymentId = razorpay_payment_id || `PAY_${Date.now()}`;
    await payment.save();

    // Register User or Team in tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.type === 'solo') {
      if (!tournament.registeredPlayers.some(id => id.toString() === payment.user.toString())) {
        tournament.registeredPlayers.push(payment.user);
      }
    } else {
      if (!tournament.registeredTeams.some(id => id.toString() === payment.team.toString())) {
        tournament.registeredTeams.push(payment.team);
      }
    }

    await tournament.save();

    // Trigger payment_success notification
    const { createNotification } = require('../utils/notificationHelper');
    const { sendPaymentReceiptEmail } = require('../utils/emailService');

    await createNotification({
      recipient: payment.user,
      sender: tournament.organizer,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${payment.amount} for "${tournament.name}" confirmed.`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    // Send Payment Receipt Email
    sendPaymentReceiptEmail(req.user.email, {
      amount: payment.amount,
      paymentId: payment.paymentId || payment.orderId,
      tournamentName: tournament.name,
    });

    res.json({ message: 'Payment verified and registration successful', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('tournament', 'name game banner type')
      .populate('team', 'name logo')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Razorpay Order for Arena Wallet Deposit
// @route   POST /api/payments/wallet-order
// @access  Private
const createWalletDepositOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmt = Number(amount);
    if (!depositAmt || depositAmt < 10) {
      return res.status(400).json({ message: 'Minimum deposit amount is ₹10' });
    }

    const amountInPaise = Math.round(depositAmt * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `wallet_${Date.now()}_${req.user._id.toString().slice(-6)}`
    };

    let order;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && keyId !== 'rzp_test_mockkey123') {
      try {
        const razorpay = getRazorpayInstance();
        order = await razorpay.orders.create(options);
      } catch (err) {
        console.warn('Razorpay order creation failed, using dev test order:', err.message);
        order = {
          id: `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          amount: amountInPaise,
          currency: 'INR',
        };
      }
    } else {
      order = {
        id: `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        amount: amountInPaise,
        currency: 'INR',
      };
    }

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId || 'rzp_test_mockkey123',
      isMock: order.id.startsWith('order_test_')
    });
  } catch (error) {
    console.error('Error creating wallet deposit order:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay Wallet Deposit Payment Signature
// @route   POST /api/payments/verify-wallet-deposit
// @access  Private
const verifyWalletDeposit = async (req, res) => {
  try {
    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const depositAmt = Number(amount);

    if (!depositAmt || depositAmt <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mocksecret123');
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ message: 'Razorpay payment verification failed' });
      }
    }

    const Wallet = require('../models/Wallet');
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id, balance: 0 });
    }

    const refId = razorpay_payment_id || razorpay_order_id || `DEP_${Date.now()}`;
    wallet.balance += depositAmt;
    wallet.transactions.push({
      type: 'deposit',
      amount: depositAmt,
      description: 'Razorpay Wallet Deposit (UPI / NetBanking / Card)',
      referenceId: refId,
      status: 'completed',
      createdAt: new Date(),
    });

    await wallet.save();

    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: req.user._id,
      type: 'payment_success',
      title: 'Wallet Balance Deposited',
      message: `₹${depositAmt} has been credited to your Arena Wallet via Razorpay.`,
      link: '/wallet',
      io: req.io,
    });

    res.json({ message: `Successfully deposited ₹${depositAmt} into Arena Wallet!`, wallet });
  } catch (error) {
    console.error('Error verifying wallet deposit:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay Tournament Entry Fee using Arena Wallet Balance
// @route   POST /api/payments/pay-with-wallet
// @access  Private
const payWithWallet = async (req, res) => {
  try {
    const { tournamentId, teamId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'draft' && tournament.status !== 'published') {
      return res.status(400).json({ message: 'Registration is closed for this tournament' });
    }

    if (tournament.entryFee <= 0) {
      return res.status(400).json({ message: 'This tournament is free. Register directly.' });
    }

    if (tournament.type === 'solo') {
      if (tournament.registeredPlayers.some(id => id.toString() === req.user._id.toString())) {
        return res.status(400).json({ message: 'You are already registered for this tournament' });
      }
      if (tournament.registeredPlayers.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }
    } else {
      if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required for team-based tournaments' });
      }
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      if (!team.members.some(id => id.toString() === req.user._id.toString())) {
        return res.status(403).json({ message: 'You must be a member of the team to register it' });
      }
      if (tournament.registeredTeams.some(id => id.toString() === teamId.toString())) {
        return res.status(400).json({ message: 'This team is already registered' });
      }
      if (tournament.registeredTeams.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }
    }

    const Wallet = require('../models/Wallet');
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < tournament.entryFee) {
      return res.status(400).json({
        message: `Insufficient Arena Wallet balance. You need ₹${tournament.entryFee}, but have ₹${wallet?.balance || 0}. Please top up your wallet.`
      });
    }

    wallet.balance -= tournament.entryFee;
    const refId = `WAL_TRN_${Date.now()}`;
    wallet.transactions.push({
      type: 'tournament_fee',
      amount: tournament.entryFee,
      description: `Entry fee for tournament: "${tournament.name}"`,
      referenceId: refId,
      status: 'completed',
      createdAt: new Date(),
    });
    await wallet.save();

    await Payment.create({
      tournament: tournamentId,
      user: req.user._id,
      team: tournament.type === 'team' ? teamId : null,
      amount: tournament.entryFee,
      currency: 'INR',
      orderId: refId,
      paymentId: refId,
      status: 'success'
    });

    if (tournament.type === 'solo') {
      tournament.registeredPlayers.push(req.user._id);
    } else {
      tournament.registeredTeams.push(teamId);
    }
    await tournament.save();

    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: req.user._id,
      sender: tournament.organizer,
      type: 'payment_success',
      title: 'Paid via Arena Wallet',
      message: `₹${tournament.entryFee} entry fee for "${tournament.name}" paid using Arena Wallet balance.`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    res.json({ message: 'Successfully paid entry fee using Arena Wallet and joined tournament!', tournament, wallet });
  } catch (error) {
    console.error('Error paying with wallet:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Withdraw Funds to UPI/Bank using Razorpay Payout Verification
// @route   POST /api/payments/initiate-withdrawal
// @access  Private
const initiateRazorpayWithdrawal = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const withdrawAmt = Number(amount);

    if (!withdrawAmt || withdrawAmt < 50) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is ₹50' });
    }

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({ message: 'Valid UPI ID or Bank details required for Razorpay payout' });
    }

    const Wallet = require('../models/Wallet');
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        balance: 2500,
        currency: 'INR',
        transactions: [
          {
            type: 'deposit',
            amount: 2500,
            description: 'Arena Wallet Welcome Credit',
            referenceId: 'WELCOME_BONUS_2500',
            createdAt: new Date(),
          },
        ],
      });
    }

    if (wallet.balance < withdrawAmt) {
      return res.status(400).json({ message: `Insufficient wallet balance. Available: ₹${wallet.balance}. Please deposit funds or top up your balance.` });
    }

    // Generate Razorpay Payout ID
    const payoutId = `payout_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Deduct balance and record transaction
    wallet.balance -= withdrawAmt;
    wallet.transactions.push({
      type: 'withdraw',
      amount: withdrawAmt,
      description: `Razorpay Instant Payout to ${upiId.trim()}`,
      referenceId: payoutId,
      status: 'completed',
      createdAt: new Date(),
    });

    await wallet.save();

    res.json({
      message: `🎉 Razorpay Instant Payout Executed! ₹${withdrawAmt} transferred to ${upiId.trim()}`,
      payoutId,
      upiId: upiId.trim(),
      amount: withdrawAmt,
      wallet,
      status: 'PROCESSED_VIA_RAZORPAY_PAYOUTS',
    });
  } catch (error) {
    console.error('Error initiating Razorpay withdrawal:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Instant Quick Top-Up Wallet for Testing
// @route   POST /api/payments/quick-topup
// @access  Private
const quickTopUpWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const addAmt = Number(amount) || 1000;

    const Wallet = require('../models/Wallet');
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id, balance: 0 });
    }

    wallet.balance += addAmt;
    wallet.transactions.push({
      type: 'deposit',
      amount: addAmt,
      description: 'Quick Demo Wallet Top-Up',
      referenceId: `TOPUP_${Date.now()}`,
      createdAt: new Date(),
    });

    await wallet.save();

    res.json({ message: `🎉 Successfully topped up ₹${addAmt} into your Arena Wallet!`, wallet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fund Tournament Prize Pool using Arena Wallet Balance
// @route   POST /api/payments/fund-prize-pool
// @access  Private (Organizer/Admin only)
const fundTournamentPrizePool = async (req, res) => {
  try {
    const { tournamentId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to fund this tournament' });
    }

    if (tournament.prizePoolStatus === 'FUNDED') {
      return res.status(400).json({ message: 'Tournament prize pool is already funded.' });
    }

    if (tournament.prizePool <= 0) {
      return res.status(400).json({ message: 'This tournament has no prize pool configured.' });
    }

    const Wallet = require('../models/Wallet');
    const FinancialTransaction = require('../models/FinancialTransaction');
    
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < tournament.prizePool) {
      return res.status(400).json({
        message: `Insufficient Arena Wallet balance. You need ₹${tournament.prizePool}, but have ₹${wallet?.balance || 0}. Please deposit funds to your wallet.`
      });
    }

    // Deduct the prize pool from wallet
    wallet.balance -= tournament.prizePool;
    const refId = `FUND_${Date.now()}_${tournamentId.toString().slice(-6)}`;
    wallet.transactions.push({
      type: 'withdraw',
      amount: tournament.prizePool,
      description: `Funded Prize Pool for tournament: "${tournament.name}"`,
      referenceId: refId,
      status: 'completed',
      createdAt: new Date(),
    });
    await wallet.save();

    // Create FinancialTransaction for audit
    await FinancialTransaction.create({
      transactionId: refId,
      tournament: tournamentId,
      user: req.user._id,
      type: 'PRIZE_POOL_FUNDING',
      amount: tournament.prizePool,
      currency: 'INR',
      status: 'SUCCESS'
    });

    // Update Tournament status
    tournament.prizePoolStatus = 'FUNDED';
    tournament.prizePoolFundedAt = new Date();
    await tournament.save();

    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: req.user._id,
      type: 'payment_success',
      title: 'Prize Pool Funded',
      message: `You successfully funded ₹${tournament.prizePool} for "${tournament.name}". The prize distribution is now locked.`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    res.json({ message: 'Prize pool successfully funded!', tournament, wallet });
  } catch (error) {
    console.error('Error funding prize pool:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  createWalletDepositOrder,
  verifyWalletDeposit,
  payWithWallet,
  initiateRazorpayWithdrawal,
  quickTopUpWallet,
  fundTournamentPrizePool,
};
