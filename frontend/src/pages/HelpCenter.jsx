import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronDown, ChevronUp, Mail, Send, HelpCircle } from 'lucide-react';
import './SupportPages.css';

const HelpCenter = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  
  // Contact Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill Full Name & Email Address if user is logged in
  useEffect(() => {
    if (user) {
      const userFullName = user.profile?.fullName || user.fullName || user.username || '';
      setName(userFullName);
      setEmail(user.email || '');
    }
  }, [user]);

  const faqs = [
    {
      id: 1,
      category: 'account',
      question: 'How do I link my Discord or X accounts?',
      answer: 'Navigate to your Player Dashboard and click on Edit Profile. From there you can supply your social handles. In a future update, this will connect directly using OAuth linkages.'
    },
    {
      id: 2,
      category: 'brackets',
      question: 'How does the Double Elimination bracket work?',
      answer: 'In a Double Elimination tournament, players must lose twice to be knocked out. When a player loses in the Winners Bracket, they automatically drop into the Losers Bracket. The final match pits the Winners Bracket champion against the Losers Bracket champion.'
    },
    {
      id: 3,
      category: 'teams',
      question: 'Can I register for a tournament without a team?',
      answer: 'Yes! For team tournaments that support Solo registrants, you can sign up as a Free Agent. Captains can then recruit Free Agents directly into their squad, or the system can automatically group you into a mixed team.'
    },
    {
      id: 4,
      category: 'brackets',
      question: 'How are match scores updated in real time?',
      answer: 'Tournament organizers update scores on the dashboard. These updates are broadcasted immediately via WebSockets (Socket.io) to all active bracket views. You do not need to refresh the page to see live advances.'
    },
    {
      id: 5,
      category: 'account',
      question: 'Can I register as both a Player and an Organizer?',
      answer: 'In Arena-Verse, accounts are assigned a role during registration. If you wish to host tournaments and also compete, you can create separate accounts or contact site administrators to grant you dual permissions.'
    },
    {
      id: 6,
      category: 'teams',
      question: 'How do I join a squad with my friends?',
      answer: 'One player must create a Team from their Player Dashboard, which makes them the Captain. They can then share the Team ID or invite code with friends, who can enter it in their dashboard to join the squad.'
    }
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    // Simulate support ticket creation
    setSubmitted(true);
    setMessage('');
    if (!user) {
      setName('');
      setEmail('');
    }
    
    setTimeout(() => {
      setSubmitted(false);
    }, 5000);
  };

  const toggleFaq = (id) => {
    if (activeFaq === id) {
      setActiveFaq(null);
    } else {
      setActiveFaq(id);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="support-page container">
      {/* Help Search Header */}
      <div className="help-search-banner">
        <h1>How can we help you?</h1>
        <p className="support-subtitle">Search our database of FAQs or contact support administrators directly.</p>
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            className="help-search-control" 
            placeholder="Type your question here (e.g. brackets, squad, discord)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="faq-grid">
        {/* Accordion FAQ list */}
        <section className="faq-section">
          <h2 className="mb-4 display-flex align-items-center gap-2">
            <HelpCircle className="text-primary" /> 
            Frequently Asked Questions
          </h2>
          
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-4 card glass-panel">
              <p className="text-secondary">No answers matching your search criteria were found.</p>
            </div>
          ) : (
            <div className="faq-list">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className={`faq-item ${activeFaq === faq.id ? 'active' : ''}`}>
                  <button className="faq-question-btn" onClick={() => toggleFaq(faq.id)}>
                    <span>{faq.question}</span>
                    {activeFaq === faq.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {activeFaq === faq.id && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact Form Side panel */}
        <aside className="support-contact-panel">
          <div className="support-contact-card glass-panel-glow">
            <h3>Submit a Ticket</h3>
            <p>Can't find what you need? Send a message to our Arena-Verse helpdesk crew.</p>

            {user && (
              <span className="badge badge-published mb-3 mt-1 inline-block">
                ✓ Auto-filled for {user.username}
              </span>
            )}

            {submitted && (
              <div className="support-success-alert">
                ✓ Support request sent successfully! An admin will reach out to your email.
              </div>
            )}

            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Gamer tag or Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea 
                  className="form-control" 
                  rows="4"
                  placeholder="Describe your issue or suggestions in detail..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary btn-full display-flex align-items-center justify-content-center gap-2">
                <Send size={16} />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HelpCenter;
