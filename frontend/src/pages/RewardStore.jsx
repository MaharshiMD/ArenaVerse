import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Coins, Zap, Flame, Award, Shield, Check, Package, Sparkles, CheckCircle2, Crown } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './RewardStore.css';

const RewardStore = () => {
  const { user, getAuthHeader } = useAuth();
  const [battlePass, setBattlePass] = useState(null);
  const [storeItems, setStoreItems] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const [bpRes, itemsRes, missionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/enterprise/battlepass`, { headers: getAuthHeader() }),
        fetch(`${API_BASE_URL}/api/enterprise/store/items`),
        fetch(`${API_BASE_URL}/api/enterprise/missions`, { headers: getAuthHeader() }),
      ]);

      if (bpRes.ok) setBattlePass(await bpRes.json());
      if (itemsRes.ok) setStoreItems(await itemsRes.json());
      if (missionsRes.ok) setMissions(await missionsRes.json());
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item) => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/store/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setBattlePass(data.battlePass);
      setActionMessage(`🎉 ${data.message}`);
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    }
  };

  const handleEquip = async (itemName, category) => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/store/equip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ itemName, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setBattlePass(data.battlePass);
      setActionMessage(`✨ ${data.message}`);
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    }
  };

  const handleClaimMission = async (mId) => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/missions/${mId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.battlePass) setBattlePass(data.battlePass);
      if (data.missions) setMissions(data.missions);
      setActionMessage(`🪙 ${data.message}`);
    } catch (err) {
      setActionMessage(`⚠️ ${err.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Arena Store & Inventory...</p></div>;
  }

  const unlockedList = battlePass?.unlockedItems || ['Default', 'Challenger'];

  return (
    <div className="reward-store-page container py-4 mt-4">
      <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag className="text-primary" size={32} /> Arena Store, Missions & Inventory
          </h1>
          <p className="section-subtitle">Earn Arena Coins through daily missions & tournaments to unlock animated frames, titles, and Battle Pass levels.</p>
        </div>
      </div>

      {actionMessage && (
        <div className="glass-panel p-3 mb-4 text-center font-bold text-sm" style={{ border: '1px solid var(--border-color-glow)', background: 'rgba(139, 92, 246, 0.15)', color: '#ffffff' }}>
          {actionMessage}
        </div>
      )}

      {/* Battle Pass Overview Card */}
      <div className="glass-panel p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-primary text-xs uppercase">{battlePass?.season || 'Season 1'} Battle Pass {battlePass?.isPremium && '⚡ PREMIUM UNLOCKED'}</span>
            <h2 className="text-white font-bold m-0 mt-1">Level {battlePass?.level || 1} Challenger</h2>
            <div className="flex gap-2 items-center mt-2 flex-wrap text-xs text-secondary">
              <span>Equipped Frame: <strong className="text-primary">{battlePass?.equippedFrame || 'Default'}</strong></span>
              <span>•</span>
              <span>Equipped Title: <strong className="text-warning">{battlePass?.equippedTitle || 'Challenger'}</strong></span>
              {battlePass?.equippedBadge && (
                <>
                  <span>•</span>
                  <span>Equipped Badge: <strong className="text-success">{battlePass?.equippedBadge}</strong></span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="glass-panel p-3 text-center" style={{ minWidth: '140px' }}>
              <p className="text-secondary text-xs font-bold m-0">Arena Coins</p>
              <h2 className="text-warning font-extrabold m-0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Coins size={20} /> {battlePass?.arenaCoins ?? 500}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 gap-4 mb-4">
        {/* Daily Missions */}
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame className="text-warning" size={20} /> Daily Missions & Challenges
          </h3>
          <div className="flex-col gap-3">
            {missions.map(m => {
              const isTaskDone = m.progress >= m.target;
              return (
                <div key={m._id} className="glass-panel p-3 flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong className="text-white text-sm">{m.title}</strong>
                    <p className="text-secondary text-xs m-0">{m.description}</p>
                    <span className="text-muted text-xs mt-1 block">Progress: {m.progress} / {m.target}</span>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-published text-xs">+{m.rewardCoins} Coins</span>
                    {m.completed ? (
                      <span className="badge badge-secondary text-xs block mt-1 py-1 px-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Check size={12} /> Claimed
                      </span>
                    ) : isTaskDone ? (
                      <button className="btn btn-primary btn-sm block mt-1 text-xs" onClick={() => handleClaimMission(m._id)}>
                        Claim Reward
                      </button>
                    ) : (
                      <button className="btn btn-secondary btn-sm block mt-1 text-xs" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                        In Progress
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Store Catalog */}
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="text-primary" size={20} /> Cosmetic Store Catalog
          </h3>
          <div className="grid-2 gap-3">
            {storeItems.map(item => {
              const isOwned = unlockedList.includes(item.name) || (item.category === 'BattlePass' && battlePass?.isPremium);
              return (
                <div key={item.id} className="glass-panel p-3 text-center flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span className="text-2xl block mb-1" style={{ fontSize: '2rem' }}>{item.icon}</span>
                    <strong className="text-white text-xs block">{item.name}</strong>
                    <span className="badge badge-secondary text-xs mt-1">{item.category}</span>
                  </div>
                  {isOwned ? (
                    <div className="mt-3">
                      <span className="badge badge-published text-xs w-full block py-1" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Owned in Inventory
                      </span>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm w-full mt-3 text-xs" 
                      onClick={() => handlePurchase(item)} 
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                    >
                      <Coins size={12} /> Buy for {item.price} Coins
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🎒 MY UNLOCKED INVENTORY & COSMETIC EQUIPMENT */}
      <div className="glass-panel p-4 mt-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h3 className="text-white font-bold m-0 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package className="text-primary" size={22} /> My Unlocked Inventory & Equipped Cosmetics
          </h3>
          <span className="badge badge-secondary text-xs">{unlockedList.length} Items Unlocked</span>
        </div>

        <p className="text-secondary text-xs mb-3">Manage and equip your unlocked avatar frames, titles, and badges to customize your player profile across ArenaVerse.</p>

        <div className="grid-3 gap-3 mt-3">
          {storeItems.map(item => {
            const isOwned = unlockedList.includes(item.name) || (item.category === 'BattlePass' && battlePass?.isPremium);
            if (!isOwned) return null;

            const isEquipped = (item.category === 'Frame' && battlePass?.equippedFrame === item.name) ||
                               (item.category === 'Title' && battlePass?.equippedTitle === item.name) ||
                               (item.category === 'Badge' && battlePass?.equippedBadge === item.name);

            return (
              <div key={`inv_${item.id}`} className="glass-panel p-3 flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: isEquipped ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="text-2xl" style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                    <span className="badge badge-secondary text-xs">{item.category}</span>
                  </div>
                  <strong className="text-white text-sm block mb-1">{item.name}</strong>
                  {isEquipped ? (
                    <span className="badge badge-warning text-xs mt-1 block" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                      ✓ Currently Equipped
                    </span>
                  ) : (
                    <span className="text-muted text-xs block mt-1">Unlocked & Ready to Equip</span>
                  )}
                </div>

                <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {item.category === 'BattlePass' ? (
                    <span className="text-xs text-success font-bold block text-center">Active Season Pass</span>
                  ) : isEquipped ? (
                    <button className="btn btn-secondary btn-sm w-full text-xs" disabled style={{ opacity: 0.7 }}>
                      ✓ Active
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm w-full text-xs" 
                      onClick={() => handleEquip(item.name, item.category)}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                    >
                      <Sparkles size={12} /> Equip {item.category}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RewardStore;
