import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, 
  PlusCircle, 
  Tag, 
  Package, 
  Download, 
  CheckCircle2, 
  Trash2, 
  Image as ImageIcon, 
  DollarSign, 
  Upload, 
  Zap, 
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './MerchStore.css';

const MerchStore = () => {
  const { user, getAuthHeader } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'jersey', 'overlay', 'digital_asset', 'my_listings'
  const [message, setMessage] = useState('');
  
  // Sell Product Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'jersey',
    price: '',
    image: '',
    description: '',
    stock: '50',
    itemType: 'physical',
    digitalFileUrl: '',
  });

  // Purchase Receipt Modal State
  const [purchaseReceipt, setPurchaseReceipt] = useState(null);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    fetchMerch();
  }, []);

  const fetchMerch = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ultimate/merch`, {
        headers: getAuthHeader(),
      });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error('Failed to fetch merch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newProduct.name || !newProduct.price) {
      setMessage('⚠️ Please enter a product title and price.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ultimate/merch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(newProduct),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to list product');

      setMessage('🎉 Product successfully put on sale in the Marketplace!');
      setShowSellModal(false);
      setNewProduct({
        name: '',
        category: 'jersey',
        price: '',
        image: '',
        description: '',
        stock: '50',
        itemType: 'physical',
        digitalFileUrl: '',
      });
      fetchMerch();
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyItem = async (item) => {
    setMessage('');
    setIsBuying(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ultimate/merch/${item._id}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to complete order');

      setPurchaseReceipt(data);
      setMessage(`🎉 Order Placed! ${item.name} purchased for ₹${item.price}.`);
      fetchMerch();
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    } finally {
      setIsBuying(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this product from the marketplace?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/ultimate/merch/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('✅ Product listing removed.');
      fetchMerch();
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    }
  };

  // Category Filtering
  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'my_listings') return item.seller === `@${user?.username}`;
    return item.category === activeTab;
  });

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Merchandise & Digital Marketplace...</p></div>;
  }

  return (
    <div className="merch-store-page container py-4 mt-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart className="text-primary" size={32} /> Merchandise Store & Digital Marketplace
          </h1>
          <p className="section-subtitle">Official team apparel, jerseys, hoodies, stream overlay graphics, and esports assets. Put your own products on sale with instant Arena Wallet payouts.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowSellModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem' }}
        >
          <PlusCircle size={18} /> Put Product on Sale / Upload
        </button>
      </div>

      {message && (
        <div className="glass-panel p-3 mb-4 text-center font-bold text-sm" style={{ border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '12px' }}>
          {message}
        </div>
      )}

      {/* Category Tabs */}
      <div className="details-tabs mb-4">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          🛒 All Products ({items.length})
        </button>
        <button className={`tab-btn ${activeTab === 'jersey' ? 'active' : ''}`} onClick={() => setActiveTab('jersey')}>
          👕 Apparel & Jerseys
        </button>
        <button className={`tab-btn ${activeTab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveTab('overlay')}>
          🎨 Stream Overlays & Graphics
        </button>
        <button className={`tab-btn ${activeTab === 'mousepad' ? 'active' : ''}`} onClick={() => setActiveTab('mousepad')}>
          🖱️ Hardware & Accessories
        </button>
        <button className={`tab-btn ${activeTab === 'my_listings' ? 'active' : ''}`} onClick={() => setActiveTab('my_listings')}>
          👤 My Selling Listings ({items.filter(i => i.seller === `@${user?.username}`).length})
        </button>
      </div>

      {/* Product Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel p-5 text-center my-4" style={{ borderRadius: '16px' }}>
          <Package size={48} className="text-secondary opacity-50 mb-3" style={{ margin: '0 auto' }} />
          <h3 className="text-white font-bold mb-1">No products found in this category</h3>
          <p className="text-muted text-xs mb-4">Be the first competitor to list an item or upload digital esports assets!</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSellModal(true)}>
            + List Your Product Now
          </button>
        </div>
      ) : (
        <div className="grid-3 gap-4">
          {filteredItems.map((item) => {
            const isOwner = item.seller === `@${user?.username}` || user?.role === 'admin';
            return (
              <div key={item._id} className="glass-panel p-4 flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
                <div>
                  {/* Card Image Container */}
                  <div className="merch-card-img-container mb-3">
                    <span className={`merch-type-badge ${item.itemType === 'digital' ? 'type-digital' : 'type-physical'}`}>
                      {item.itemType === 'digital' ? '⚡ DIGITAL ASSET' : '📦 PHYSICAL MERCH'}
                    </span>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="merch-card-img" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="merch-placeholder-icon">
                        {item.itemType === 'digital' ? <Download size={36} /> : <Package size={36} />}
                        <span className="text-xs font-bold">{item.category.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Header badges */}
                  <div className="flex items-center justify-between mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-primary text-xs uppercase" style={{ fontSize: '0.65rem' }}>{item.category}</span>
                    <span className="text-secondary text-xs font-bold">{item.seller}</span>
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-white font-extrabold text-md mb-1">{item.name}</h3>
                  <p className="text-muted text-xs mb-2" style={{ minHeight: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.description || 'Premium esports gear & high quality digital assets.'}
                  </p>

                  <div className="flex items-center justify-between my-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-warning font-extrabold text-xl" style={{ letterSpacing: '0.02em' }}>
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-muted text-xs">
                      Stock: <strong className={item.stock > 0 ? 'text-success' : 'text-danger'}>{item.stock} left</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button 
                    className="btn btn-primary btn-sm w-full" 
                    onClick={() => handleBuyItem(item)}
                    disabled={isBuying || item.stock <= 0}
                    style={{ gap: '6px' }}
                  >
                    <ShoppingCart size={14} />
                    <span>{item.stock <= 0 ? 'Out of Stock' : `Buy Now (₹${item.price})`}</span>
                  </button>

                  {isOwner && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleDeleteItem(item._id)}
                      title="Remove listing"
                      style={{ padding: '6px 10px', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Put Product on Sale / Upload Modal */}
      {showSellModal && (
        <div className="merch-modal-overlay">
          <div className="merch-modal-content p-4">
            <div className="flex items-center justify-between mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 className="text-white font-extrabold text-lg m-0 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} className="text-primary" /> Put Product on Sale / Upload Asset
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSellModal(false)} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label text-xs text-secondary">Product Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Cyberpunk Custom Team Jersey 2026 or Animated Overlay Pack" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs text-secondary">Product Category</label>
                  <select 
                    className="form-control" 
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    <option value="jersey">👕 Team Jersey & Apparel</option>
                    <option value="hoodie">🧥 Gaming Hoodie</option>
                    <option value="overlay">🎨 Stream Overlay & Graphics</option>
                    <option value="mousepad">🖱️ RGB Mousepad & Desk Mat</option>
                    <option value="digital_asset">⚡ Digital Asset / File</option>
                    <option value="hardware">🎧 Hardware & Gaming Gear</option>
                    <option value="custom">🛠️ Custom Esports Product</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs text-secondary">Listing Format / Type</label>
                  <select 
                    className="form-control" 
                    value={newProduct.itemType}
                    onChange={e => setNewProduct({ ...newProduct, itemType: e.target.value })}
                  >
                    <option value="physical">📦 Physical Merchandise (Shipping)</option>
                    <option value="digital">⚡ Digital Asset (Instant Download Link)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs text-secondary">Price (₹ INR) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 1499" 
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    min={10}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs text-secondary">Available Stock Quantity</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="50" 
                    value={newProduct.stock}
                    onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                    min={1}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs text-secondary">Product Preview Image URL (Optional)</label>
                <input 
                  type="url" 
                  className="form-control" 
                  placeholder="https://images.unsplash.com/photo-... or custom image link" 
                  value={newProduct.image}
                  onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                />
              </div>

              {newProduct.itemType === 'digital' && (
                <div className="form-group">
                  <label className="form-label text-xs text-secondary">Digital Asset File Download Link (Google Drive / Zip / Dropbox)</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    placeholder="https://drive.google.com/file/d/... or asset URL" 
                    value={newProduct.digitalFileUrl}
                    onChange={e => setNewProduct({ ...newProduct, digitalFileUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label text-xs text-secondary">Product Description & Details</label>
                <textarea 
                  className="form-control" 
                  rows={3} 
                  placeholder="Describe material, sizing, resolution, included graphics files, or shipping delivery timelines..."
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary w-full py-2 mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Publishing Listing...' : '🚀 Publish & Put Product on Sale'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Receipt Confirmation Modal */}
      {purchaseReceipt && (
        <div className="merch-modal-overlay">
          <div className="merch-modal-content p-5 text-center">
            <div style={{ margin: '0 auto 12px auto', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h2 className="text-white font-extrabold text-lg mb-1">Order Placed Successfully!</h2>
            <p className="text-secondary text-xs mb-4">Payment processed via your Arena Wallet balance.</p>

            <div className="glass-panel p-3 mb-4 text-left flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Item Name:</span>
                <strong className="text-white">{purchaseReceipt.item?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Amount Paid:</span>
                <strong className="text-success">₹{purchaseReceipt.item?.price}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Seller:</span>
                <strong className="text-warning">{purchaseReceipt.item?.seller}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span className="text-muted">Order Ref ID:</span>
                <strong className="text-secondary" style={{ fontSize: '11px' }}>{purchaseReceipt.orderId}</strong>
              </div>
            </div>

            {purchaseReceipt.digitalDownloadUrl && (
              <div className="mb-4">
                <a 
                  href={purchaseReceipt.digitalDownloadUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-warning w-full py-2"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download size={18} /> Download Digital Asset Package
                </a>
              </div>
            )}

            <button className="btn btn-primary w-full text-xs" onClick={() => setPurchaseReceipt(null)}>
              Close Order Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchStore;
