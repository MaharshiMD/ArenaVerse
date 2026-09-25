import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Coins, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Users, 
  Send, 
  ArrowRightLeft, 
  UserCheck, 
  Shield, 
  ChevronRight 
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './ArenaWallet.css';

const ArenaWallet = () => {
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();
  const [searchParams] = useSearchParams();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('200');
  const [upiId, setUpiId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Teammate & Squad Money Transfer State
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('teamId') || '');
  const [selectedMemberId, setSelectedMemberId] = useState(searchParams.get('recipientId') || '');
  const [transferUsername, setTransferUsername] = useState(searchParams.get('username') || '');
  const [transferMode, setTransferMode] = useState(searchParams.get('recipientId') || !searchParams.get('username') ? 'team' : 'username');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferProcessing, setTransferProcessing] = useState(false);
  const [transferReceipt, setTransferReceipt] = useState(null);

  useEffect(() => {
    fetchWallet();
    fetchMyTeams();
  }, []);

  const fetchMyTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/my`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const teamsData = await res.json();
        setMyTeams(teamsData || []);
        if (teamsData && teamsData.length > 0 && !selectedTeamId) {
          const prefillTeam = searchParams.get('teamId') 
            ? teamsData.find(t => t._id === searchParams.get('teamId')) 
            : teamsData[0];
          setSelectedTeamId(prefillTeam ? prefillTeam._id : teamsData[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load user squads:', err);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/wallet`, {
        headers: getAuthHeader(),
      });
      if (res.ok) setWallet(await res.json());
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time automatic wallet balance updates when tournament prize is delivered
  useEffect(() => {
    if (!socket) return;
    const handleWalletRefresh = (data) => {
      fetchWallet();
      if (data?.balanceChange) {
        setActionMessage(`🏆 Tournament Prize Payout: ₹${data.balanceChange} was automatically credited to your wallet!`);
      }
    };

    socket.on('wallet_updated', handleWalletRefresh);
    socket.on('tournament_completed', handleWalletRefresh);

    return () => {
      socket.off('wallet_updated', handleWalletRefresh);
      socket.off('tournament_completed', handleWalletRefresh);
    };
  }, [socket]);

  const handleDepositRazorpay = async (e) => {
    e.preventDefault();
    setActionMessage('');
    const amountNum = Number(depositAmount);
    if (!amountNum || amountNum < 10) {
      setActionMessage('⚠️ Minimum deposit amount is ₹10');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Razorpay Wallet Deposit Order
      const orderRes = await fetch(`${API_BASE_URL}/api/payments/wallet-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ amount: amountNum }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Failed to initialize payment');
      }

      // 2. ALWAYS Open Razorpay Checkout Overlay Window
      const razorpayKey = orderData.keyId && orderData.keyId !== 'rzp_test_mockkey123'
        ? orderData.keyId
        : 'rzp_test_mockkey123';

      const options = {
        key: razorpayKey,
        amount: orderData.amount || amountNum * 100,
        currency: orderData.currency || 'INR',
        name: 'Arena-Verse eSports',
        description: `Arena Wallet Deposit - ₹${amountNum}`,
        image: '/images/logo-favicon.png',
        prefill: {
          name: user?.username || 'Competitor',
          email: user?.email || 'player@arenaverse.com',
          contact: '9999999999',
        },
        theme: {
          color: '#8b5cf6',
        },
        handler: async function (response) {
          try {
            setActionMessage('🔄 Verifying payment with Razorpay...');
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify-wallet-deposit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader(),
              },
              body: JSON.stringify({
                amount: amountNum,
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || '',
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            setWallet(verifyData.wallet);
            setActionMessage(`🎉 Payment Verified! Successfully deposited ₹${amountNum} into your Arena Wallet.`);
          } catch (err) {
            setActionMessage(`⚠️ ${err.message}`);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setActionMessage('ℹ️ Deposit payment window was closed.');
          },
        },
      };

      // Attach real order_id if generated by Razorpay server
      if (!orderData.isMock && orderData.orderId && !orderData.orderId.startsWith('order_test_')) {
        options.order_id = orderData.orderId;
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setIsProcessing(false);
          setActionMessage(`⚠️ Payment failed: ${response.error?.description || 'Transaction declined'}`);
        });
        rzp.open();
      } else {
        throw new Error('Razorpay SDK script not loaded on page. Please refresh and try again.');
      }
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
      setIsProcessing(false);
    }
  };

  const [payoutReceipt, setPayoutReceipt] = useState(null);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setActionMessage('');
    const amountNum = Number(withdrawAmount);

    if (!amountNum || amountNum < 50) {
      setActionMessage('⚠️ Minimum withdrawal amount is ₹50');
      return;
    }

    if (!upiId || !upiId.trim()) {
      setActionMessage('⚠️ Please enter a valid UPI ID (e.g. gamer@upi) or Bank Account details before requesting withdrawal.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/initiate-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ amount: amountNum, upiId: upiId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setWallet(data.wallet);
      setPayoutReceipt(data);
      setActionMessage(`🎉 Razorpay Payout Verified & Executed! ₹${amountNum} transferred to ${upiId.trim()}`);
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickTopUp = async () => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/quick-topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ amount: 1000 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setWallet(data.wallet);
      setActionMessage('🎉 Added ₹1,000 demo funds to your Arena Wallet!');
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    }
  };

  const handleTransferFunds = async (e) => {
    e.preventDefault();
    setActionMessage('');
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      setActionMessage('⚠️ Please enter a valid transfer amount greater than ₹0.');
      return;
    }
    if (wallet && wallet.balance < amt) {
      setActionMessage(`⚠️ Insufficient wallet balance! Your available balance is ₹${(wallet.balance || 0).toLocaleString('en-IN')}, but you entered ₹${amt.toLocaleString('en-IN')}.`);
      return;
    }
    
    const cleanUsername = (transferUsername || '').trim().replace(/^@/, '');
    if (!selectedMemberId && !cleanUsername) {
      setActionMessage('⚠️ Please specify a recipient teammate: type their username manually or click a squad member.');
      return;
    }

    setTransferProcessing(true);
    try {
      const payload = {
        amount: amt,
        note: transferNote,
        teamId: selectedTeamId || undefined,
        recipientId: selectedMemberId || undefined,
        recipientUsername: cleanUsername || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/api/nextgen/wallet/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      setWallet(data.wallet);
      setTransferReceipt(data);
      setActionMessage(`🎉 Successfully transferred ₹${amt} to @${data.recipient?.username}!`);
      setTransferAmount('');
      setTransferNote('');
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    } finally {
      setTransferProcessing(false);
    }
  };

  const currentSelectedTeam = myTeams.find(t => t._id === selectedTeamId);
  const currentTeamTeammates = (currentSelectedTeam?.members || []).filter(
    m => (m._id || m).toString() !== (user?.id || user?._id)?.toString()
  );
  const selectedTeammateObj = currentTeamTeammates.find(m => (m._id || m).toString() === selectedMemberId);

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Arena Wallet...</p></div>;
  }

  return (
    <div className="arena-wallet-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title">Arena Wallet & Cash Management</h1>
        <p className="section-subtitle">Store tournament prize winnings, deposit funds via Razorpay / UPI for entry fees, and withdraw to bank or UPI via Razorpay Payouts.</p>
      </div>

      {actionMessage && (
        <div className="glass-panel p-3 mb-4 text-center font-bold text-sm" style={{ border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '12px' }}>
          {actionMessage}
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="glass-panel p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="text-secondary text-xs font-bold uppercase m-0">Available Arena Balance</p>
            <h1 className="text-white font-extrabold m-0" style={{ fontSize: '2.8rem', letterSpacing: '0.02em' }}>
              ₹{(wallet?.balance || 0).toLocaleString('en-IN')}
            </h1>
            <p className="text-muted text-xs mt-1 m-0">Currency: {wallet?.currency || 'INR'} | Account: @{user?.username}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handleQuickTopUp}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <Zap size={14} className="text-warning" /> Add ₹1,000 Demo Funds
            </button>
            <Wallet size={48} className="text-primary opacity-90" />
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid-2 gap-4 mb-4">
        <div className="glass-panel p-4" style={{ borderRadius: '16px' }}>
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <ArrowDownRight className="text-success" size={20} /> Deposit Funds via Razorpay / UPI
          </h3>

          <div className="mb-3">
            <label className="form-label text-xs text-secondary">Quick Amount Select</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {['100', '500', '1000', '2500', '5000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`btn btn-sm ${depositAmount === amt ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDepositAmount(amt)}
                  style={{ borderRadius: '8px', fontSize: '0.8rem', padding: '4px 12px' }}
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleDepositRazorpay} className="flex-col gap-3">
            <div className="form-group">
              <label className="form-label">Custom Deposit Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                min={10}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isProcessing} style={{ gap: '8px' }}>
              <CreditCard size={16} />
              <span>{isProcessing ? 'Opening Razorpay...' : 'Pay & Deposit via Razorpay / UPI'}</span>
            </button>
          </form>
        </div>

        <div className="glass-panel p-4" style={{ borderRadius: '16px' }}>
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <ArrowUpRight className="text-warning" size={20} /> Withdraw Winnings via Razorpay Payouts
          </h3>
          <form onSubmit={handleWithdraw} className="flex-col gap-3">
            <div className="form-group">
              <label className="form-label">Withdraw Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                min={50}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payout UPI ID / Bank A/C <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. gamer@upi or 123456789 (SBI)"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-warning w-full" disabled={isProcessing} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={16} />
              <span>{isProcessing ? 'Processing Payout...' : 'Request Instant Razorpay Payout'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Teammate & Squad Money Transfer Section */}
      <div className="glass-panel p-4 mb-4" style={{ borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.35)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.08))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 className="text-white font-bold m-0 flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
              <Users className="text-success" size={22} /> Squad & Teammate Money Transfer
            </h3>
            <p className="text-secondary text-xs m-0 mt-1">
              Easily distribute tournament prize winnings or send funds to any specific teammate or squad member instantly.
            </p>
          </div>
        </div>

        <form onSubmit={handleTransferFunds}>
          <div className="grid-2 gap-4 mb-3">
            {/* Squad / Team Context */}
            <div className="form-group">
              <label className="form-label text-xs text-secondary font-bold">Squad Context (Optional)</label>
              {myTeams.length === 0 ? (
                <p className="text-muted text-xs p-2" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  No squads found. You can write the recipient's username manually in the field on the right!
                </p>
              ) : (
                <select
                  className="form-control"
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                  }}
                  style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
                >
                  <option value="">-- Direct Transfer (No Squad) --</option>
                  {myTeams.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.members.length} members)
                    </option>
                  ))}
                </select>
              )}
              <small className="text-muted text-xs mt-1 block">
                Selecting a squad lets you click quick teammate shortcuts below.
              </small>
            </div>

            {/* Recipient Teammate / Username Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label text-xs text-secondary font-bold m-0">
                  Recipient Teammate / Username <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {(selectedMemberId || transferUsername) && (
                  <span className="text-success text-xs" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={12} /> Ready
                  </span>
                )}
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Type teammate username (e.g. Mouse, DuoEnough, Ujjas)..."
                value={transferUsername}
                onChange={e => {
                  const val = e.target.value;
                  setTransferUsername(val);
                  const matched = (currentTeamTeammates || []).find(
                    m => m.username?.toLowerCase() === val.toLowerCase().trim().replace(/^@/, '')
                  );
                  setSelectedMemberId(matched ? matched._id : '');
                }}
                style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
                required
              />

              {/* Clickable Quick Teammate Chips */}
              {currentTeamTeammates && currentTeamTeammates.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span className="text-secondary text-xs block mb-1" style={{ fontSize: '11px' }}>
                    Quick Select From Selected Squad:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {currentTeamTeammates.map(m => {
                      const isCap = (currentSelectedTeam?.captain?._id || currentSelectedTeam?.captain)?.toString() === m._id.toString();
                      const isSelected = selectedMemberId === m._id || transferUsername.toLowerCase().trim().replace(/^@/, '') === m.username.toLowerCase();
                      return (
                        <button
                          key={m._id}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setSelectedMemberId(m._id);
                            setTransferUsername(m.username);
                          }}
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)',
                            color: isSelected ? '#10b981' : '#e2e8f0',
                            border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <span>@{m.username}</span>
                          {isCap && <span style={{ fontSize: '9px', color: '#f59e0b' }}>👑</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount and Note */}
          <div className="grid-2 gap-4 mb-3">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label text-xs text-secondary font-bold m-0">Transfer Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                <span className="text-muted text-xs">Available: ₹{(wallet?.balance || 0).toLocaleString('en-IN')}</span>
              </div>
              <input
                type="number"
                className="form-control"
                placeholder="Enter amount manually (e.g. 10379)"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                min="1"
                step="any"
                style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
                required
              />
              {/* Quick Split Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {[
                  { label: '₹100', val: 100 },
                  { label: '₹500', val: 500 },
                  { label: '₹1,000', val: 1000 },
                  { label: '25% Prize', val: Math.floor((wallet?.balance || 0) * 0.25) },
                  { label: '50% Split', val: Math.floor((wallet?.balance || 0) * 0.5) },
                  { label: 'Full Balance', val: wallet?.balance || 0 },
                ].filter(b => b.val > 0 && b.val <= (wallet?.balance || 0)).map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setTransferAmount(chip.val.toString())}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label text-xs text-secondary font-bold">Transfer Note / Reason (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 50% Prize Pool Split - Grand Finals Victory"
                value={transferNote}
                onChange={e => setTransferNote(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}
              />
              <small className="text-muted text-xs mt-1 block">
                This note will be recorded in both players' transaction records and notifications.
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={transferProcessing || !transferAmount || Number(transferAmount) <= 0 || (!selectedMemberId && !transferUsername.trim())}
              style={{
                background: '#10b981',
                borderColor: '#10b981',
                padding: '8px 24px',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px'
              }}
            >
              <Send size={15} />
              <span>{transferProcessing ? 'Transferring...' : `Transfer ₹${Number(transferAmount) || 0} to Teammate`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Razorpay Payout Success Modal */}
      {payoutReceipt && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-5 text-center flex-col" style={{ width: '480px', maxWidth: '90vw', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px' }}>
            <div style={{ margin: '0 auto 12px auto', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h2 className="text-white font-extrabold text-lg mb-1">Razorpay Payout Executed!</h2>
            <p className="text-secondary text-xs mb-4">Instant cash withdrawal successfully processed via Razorpay Payouts API.</p>

            <div className="glass-panel p-3 mb-4 text-left flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Payout Amount:</span>
                <strong className="text-success">₹{payoutReceipt.amount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Destination UPI / Bank:</span>
                <strong className="text-white">{payoutReceipt.upiId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Razorpay Reference ID:</span>
                <strong className="text-warning" style={{ fontSize: '11px' }}>{payoutReceipt.payoutId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Payout Gateway:</span>
                <span className="badge badge-published text-xs">RAZORPAY PAYOUTS</span>
              </div>
            </div>

            <button className="btn btn-primary w-full text-xs" onClick={() => setPayoutReceipt(null)}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Teammate Money Transfer Receipt Modal */}
      {transferReceipt && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-5 text-center flex-col" style={{ width: '480px', maxWidth: '90vw', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '16px' }}>
            <div style={{ margin: '0 auto 12px auto', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h2 className="text-white font-extrabold text-lg mb-1">Transfer Complete!</h2>
            <p className="text-secondary text-xs mb-4">Funds were instantly delivered to your teammate's Arena Wallet.</p>

            <div className="glass-panel p-3 mb-4 text-left flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Transferred Amount:</span>
                <strong className="text-success font-bold" style={{ fontSize: '14px' }}>₹{transferReceipt.amount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Recipient Teammate:</span>
                <strong className="text-white">@{transferReceipt.recipient?.username}</strong>
              </div>
              {transferReceipt.teamName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span className="text-muted">Squad:</span>
                  <span className="text-primary font-bold">{transferReceipt.teamName}</span>
                </div>
              )}
              {transferReceipt.note && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span className="text-muted">Note:</span>
                  <span className="text-secondary italic">"{transferReceipt.note}"</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Transaction ID:</span>
                <span className="text-warning text-xs">{transferReceipt.referenceId}</span>
              </div>
            </div>

            <button className="btn btn-primary w-full text-xs" onClick={() => setTransferReceipt(null)}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="glass-panel p-4" style={{ borderRadius: '16px' }}>
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" /> Verified Wallet Transactions
        </h3>
        {!wallet?.transactions || wallet.transactions.length === 0 ? (
          <p className="text-muted text-center py-4">No wallet transactions recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Description</th>
                  <th style={{ padding: '10px' }}>Reference ID</th>
                  <th style={{ padding: '10px' }}>Amount</th>
                  <th style={{ padding: '10px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.slice().reverse().map((txn, idx) => {
                  const isCredit = txn.type === 'deposit' || txn.type === 'prize_payout' || txn.type === 'p2p_transfer_received' || txn.type === 'transfer_received';
                  const typeLabel = txn.type === 'p2p_transfer_received' || txn.type === 'transfer_received'
                    ? 'TRANSFER IN'
                    : txn.type === 'p2p_transfer_sent' || txn.type === 'transfer_sent'
                    ? 'TRANSFER OUT'
                    : txn.type.toUpperCase();

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${isCredit ? 'badge-published' : 'badge-draft'}`} style={{ fontSize: '0.7rem' }}>
                          {typeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }} className="text-white text-xs">{txn.description}</td>
                      <td style={{ padding: '10px' }} className="text-secondary text-xs">{txn.referenceId || 'N/A'}</td>
                      <td style={{ padding: '10px' }} className={`font-bold ${isCredit ? 'text-success' : 'text-danger'}`}>
                        {isCredit ? '+' : '-'}₹{txn.amount}
                      </td>
                      <td style={{ padding: '10px' }} className="text-muted text-xs">
                        {new Date(txn.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArenaWallet;

