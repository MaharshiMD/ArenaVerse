import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ThumbsUp, PlusCircle, CheckSquare, Send, Heart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import AvatarFrame from '../components/AvatarFrame';
import { API_BASE_URL } from '../config/api';
import './CommunityForums.css';

const CommunityForums = () => {
  const { user, getAuthHeader } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('General');
  const [contentInput, setContentInput] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchForumData();
  }, [activeCategory]);

  const fetchForumData = async () => {
    setLoading(true);
    try {
      const categoryParam = activeCategory !== 'all' ? `?category=${activeCategory}` : '';
      const [postsRes, pollsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/enterprise/forums${categoryParam}`),
        fetch(`${API_BASE_URL}/api/enterprise/polls`),
      ]);

      if (postsRes.ok) setPosts(await postsRes.json());
      if (pollsRes.ok) setPolls(await pollsRes.json());
    } catch (err) {
      console.error('Failed to load forum data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/forums`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: titleInput,
          category: categoryInput,
          content: contentInput,
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');
      const newPost = await res.json();
      setPosts([newPost, ...posts]);
      setShowCreateModal(false);
      setTitleInput('');
      setContentInput('');
      setActionMessage('🎉 Discussion thread published successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleLike = async (postId) => {
    if (!user) {
      alert('Please log in to like threads.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/forums/${postId}/like`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(posts.map(p => p._id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleAddComment = async (postId, e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to reply.');
      return;
    }

    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/forums/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(posts.map(p => p._id === postId ? updatedPost : p));
        setCommentInputs({ ...commentInputs, [postId]: '' });
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    if (!user) {
      alert('Please log in to vote in community polls.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ optionIndex }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPolls(data.polls);
      setActionMessage('🗳️ Vote recorded live!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="community-forums-page container py-4 mt-4">
      <div className="header-flex mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title m-0 flex items-center gap-2">
            <MessageSquare className="text-primary" size={32} /> Community Forums & Polls
          </h1>
          <p className="section-subtitle m-0">Participate in esports discussions, strategy guides, community polls, and tournaments.</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} /> New Discussion Thread
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="glass-panel p-3 mb-4 text-center font-bold text-sm" style={{ border: '1px solid var(--border-color-glow)', background: 'rgba(139, 92, 246, 0.15)', color: '#ffffff' }}>
          {actionMessage}
        </div>
      )}

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {['all', 'General', 'Tournament Discussion', 'Recruitment', 'Support'].map(cat => (
          <button key={cat} className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveCategory(cat)}>
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid-3 gap-4">
        {/* Forum Threads Column */}
        <div className="col-span-2 flex-col gap-3" style={{ gridColumn: 'span 2' }}>
          {loading ? (
            <div className="text-center py-5"><p className="text-secondary text-sm">Loading discussion threads...</p></div>
          ) : posts.length === 0 ? (
            <div className="glass-panel text-center py-5">
              <MessageSquare size={40} className="text-muted mb-2" />
              <h3>No Discussion Threads Found</h3>
              <p className="text-secondary text-sm">Be the first player to start a discussion in this category!</p>
            </div>
          ) : (
            posts.map(post => {
              const isLiked = user && post.likes?.some(lId => (typeof lId === 'object' ? lId._id : lId) === user.id);
              const isExpanded = expandedPostId === post._id;

              return (
                <div key={post._id} className="forum-card glass-panel p-4 mb-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AvatarFrame 
                        src={post.author?.profile?.avatar} 
                        size={42} 
                        frame={post.author?.profile?.equippedFrame || 'Default'} 
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Link to={`/players/${post.author?.username}`} className="text-white font-bold text-sm" style={{ textDecoration: 'none' }}>
                            @{post.author?.username || 'Player'}
                          </Link>
                          {post.author?.profile?.equippedTitle && (
                            <span className="equipped-title-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              👑 {post.author.profile.equippedTitle}
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-xs block mt-1">
                          {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-primary text-xs">{post.category}</span>
                  </div>

                  <h3 className="text-white font-bold text-md mb-2">{post.title}</h3>
                  <p className="text-secondary text-sm mb-4" style={{ lineHeight: '1.6', whiteSpace: 'pre-line' }}>{post.content}</p>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                    <button 
                      className={`btn btn-sm text-xs ${isLiked ? 'btn-primary' : 'btn-secondary'}`} 
                      onClick={() => handleToggleLike(post._id)} 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Heart size={14} fill={isLiked ? '#ffffff' : 'none'} /> 
                      <span>{post.likes?.length || 0} Likes</span>
                    </button>

                    <button 
                      className="btn btn-secondary btn-sm text-xs" 
                      onClick={() => setExpandedPostId(isExpanded ? null : post._id)} 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <MessageSquare size={14} /> 
                      <span>{post.comments?.length || 0} Replies</span>
                    </button>
                  </div>

                  {/* Expanded Comments Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 className="text-white text-xs font-bold mb-3 uppercase tracking-wider">Discussion Replies ({post.comments?.length || 0})</h4>
                      
                      <div className="flex-col gap-3 mb-3">
                        {post.comments?.length === 0 ? (
                          <p className="text-muted text-xs italic">No replies yet. Be the first to join the conversation!</p>
                        ) : (
                          post.comments?.map((c, idx) => (
                            <div key={idx} className="glass-panel p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <AvatarFrame 
                                  src={c.author?.profile?.avatar} 
                                  size={24} 
                                  frame={c.author?.profile?.equippedFrame || 'Default'} 
                                />
                                <strong className="text-white text-xs">@{c.author?.username || 'Player'}</strong>
                                {c.author?.profile?.equippedTitle && (
                                  <span className="equipped-title-badge" style={{ fontSize: '9px', padding: '0 4px' }}>
                                    👑 {c.author.profile.equippedTitle}
                                  </span>
                                )}
                                <span className="text-muted text-xs ml-auto" style={{ fontSize: '10px' }}>
                                  {new Date(c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-secondary text-xs m-0" style={{ paddingLeft: '32px' }}>{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply Input Form */}
                      {user && (
                        <form onSubmit={(e) => handleAddComment(post._id, e)} style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            className="form-control text-xs" 
                            placeholder="Write a community reply..." 
                            value={commentInputs[post._id] || ''} 
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })} 
                            style={{ flex: 1 }}
                            required 
                          />
                          <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Send size={12} /> Reply
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Community Polls Column */}
        <div className="flex-col gap-3">
          <div className="glass-panel p-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare className="text-warning" size={20} /> Active Community Polls
            </h3>
            {polls.map(poll => {
              const totalVotes = poll.options?.reduce((sum, o) => sum + (o.votes?.length || 0), 0) || 0;

              return (
                <div key={poll._id} className="mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong className="text-white text-sm block mb-2">{poll.question}</strong>
                  <span className="text-muted text-xs block mb-3">Total Votes Cast: <strong>{totalVotes}</strong></span>

                  <div className="flex-col gap-2">
                    {poll.options?.map((opt, idx) => {
                      const voteCount = opt.votes?.length || 0;
                      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                      const hasVotedThis = user && opt.votes?.some(vId => (typeof vId === 'object' ? vId._id : vId) === user.id);

                      return (
                        <div key={idx} className="mb-2">
                          <button 
                            className={`btn btn-sm w-full text-left justify-between ${hasVotedThis ? 'btn-primary' : 'btn-secondary'}`} 
                            onClick={() => handleVotePoll(poll._id, idx)} 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}
                          >
                            <span className="text-xs font-semibold">{opt.text} {hasVotedThis && '✓ (Your Vote)'}</span>
                            <span className="badge badge-secondary text-xs">{voteCount} votes ({percentage}%)</span>
                          </button>
                          
                          {/* Progress Bar */}
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, background: hasVotedThis ? 'var(--accent-gold)' : 'var(--accent-primary)', transition: 'width 0.4s ease' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-4" style={{ width: '480px', maxWidth: '90vw' }}>
            <h3 className="mb-3 text-white">Create New Discussion Thread</h3>
            <form onSubmit={handleCreatePost} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Thread Title</label>
                <input type="text" className="form-control" value={titleInput} onChange={e => setTitleInput(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={categoryInput} onChange={e => setCategoryInput(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Tournament Discussion">Tournament Discussion</option>
                  <option value="Recruitment">Recruitment</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-control" rows={4} value={contentInput} onChange={e => setContentInput(e.target.value)} required></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary flex-1">Publish Thread</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityForums;
