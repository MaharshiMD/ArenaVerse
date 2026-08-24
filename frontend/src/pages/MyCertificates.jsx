import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Award, Download, Eye, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import EsportsCertificateModal from '../components/EsportsCertificateModal';
import { API_BASE_URL } from '../config/api';

const MyCertificates = () => {
  const { user } = useAuth();
  const [userCertificates, setUserCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchUserCertificates = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/certificates/my-certificates`, {
          headers: getAuthHeader(),
        });

        if (res.ok) {
          const data = await res.json();
          setUserCertificates(data.certificates || []);
        } else {
          // Fallback: fetch completed tournaments where user is winner/runner-up
          const tourRes = await fetch(`${API_BASE_URL}/api/tournaments?status=completed`);
          if (tourRes.ok) {
            const data = await tourRes.json();
            const tournaments = Array.isArray(data) ? data : (data.tournaments || []);
            const usernameLower = (user?.username || '').toLowerCase();
            const certs = [];

            tournaments.forEach((t) => {
              const isWinner = t.winnerName && t.winnerName.toLowerCase() === usernameLower;
              const isRunner = t.runnerUpName && t.runnerUpName.toLowerCase() === usernameLower;

              if (isWinner) {
                certs.push({
                  tournament: t,
                  certType: 'champion',
                  placement: 1,
                  recipientName: user?.username,
                  prizeWon: Math.round((t.prizePool || 0) * 0.7),
                  date: t.completedAt || t.updatedAt || t.endDate,
                });
              }
              if (isRunner) {
                certs.push({
                  tournament: t,
                  certType: 'runnerup',
                  placement: 2,
                  recipientName: user?.username,
                  prizeWon: Math.round((t.prizePool || 0) * 0.3),
                  date: t.completedAt || t.updatedAt || t.endDate,
                });
              }
            });

            setUserCertificates(certs);
          }
        }
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCertificates();
  }, [user]);

  const handleOpenCertificate = (cert) => {
    setSelectedCert({
      tournament: cert.tournament,
      certType: cert.certType,
      recipientName: cert.recipientName || user?.username || 'Champion',
    });
    setModalOpen(true);
  };

  return (
    <div className="container py-4">
      {/* Page Header */}
      <div className="glass-panel p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="avatar-med bg-primary text-white font-bold flex items-center justify-center" style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
            <Trophy size={30} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>My Official eSports Certificates</h1>
            <p className="text-secondary" style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Download and view high-resolution 3508 × 2480 px official certificates awarded exclusively to Tournament Champions and Runners-Up.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <p className="text-secondary text-sm">Loading your earned certificates...</p>
        </div>
      ) : userCertificates.length > 0 ? (
        <div className="grid-2 gap-4">
          {userCertificates.map((cert, index) => {
            const t = cert.tournament || {};
            const isChamp = cert.certType === 'champion';

            return (
              <div
                key={`${t._id || index}_${cert.certType}`}
                className="glass-panel p-4 flex flex-col justify-between"
                style={{
                  border: isChamp ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '16px',
                  background: isChamp ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(15, 23, 42, 0.6))' : 'linear-gradient(135deg, rgba(148, 163, 184, 0.05), rgba(15, 23, 42, 0.6))'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                      🎮 {t.game || 'eSports'}
                    </span>
                    <span className="badge" style={{
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: isChamp ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                      color: isChamp ? '#fbbf24' : '#e2e8f0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={13} /> {isChamp ? '1st Place Champion' : '2nd Place Runner-Up'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>{t.name || 'Tournament'}</h3>
                  <p className="text-muted text-xs mb-3">Issued to: <strong className="text-white">{cert.recipientName || user?.username}</strong></p>

                  <div className="glass-panel p-3 text-center mb-3" style={{
                    background: isChamp ? 'rgba(251, 191, 36, 0.12)' : 'rgba(203, 213, 225, 0.12)',
                    border: isChamp ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(203, 213, 225, 0.3)',
                    borderRadius: '12px'
                  }}>
                    <span className="text-xs font-bold block mb-1" style={{ color: isChamp ? '#fbbf24' : '#cbd5e1' }}>
                      {isChamp ? '🏆 CHAMPIONSHIP TITLE' : '🥈 RUNNER-UP TITLE'}
                    </span>
                    {cert.prizeWon > 0 && (
                      <span className="text-sm font-semibold text-green block">Prize Awarded: ₹{cert.prizeWon}</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <button
                    className={`btn ${isChamp ? 'btn-primary' : 'btn-secondary'} w-full`}
                    onClick={() => handleOpenCertificate(cert)}
                    style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                  >
                    <Download size={16} />
                    <span>View & Download My Certificate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel text-center py-5" style={{ borderRadius: '16px' }}>
          <Trophy size={48} className="text-warning mb-3" style={{ margin: '0 auto', opacity: 0.8 }} />
          <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>No Certificates Earned Yet</h3>
          <p className="text-muted text-sm" style={{ maxWidth: '480px', margin: '0 auto' }}>
            Arena-Verse certificates are exclusively awarded to players who place <strong>1st (Champion)</strong> or <strong>2nd (Runner-Up)</strong> in official completed tournaments.
          </p>
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <EsportsCertificateModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCert(null);
          }}
          tournament={selectedCert.tournament}
          initialWinnerName={selectedCert.recipientName || user?.username}
          initialRunnerUpName={selectedCert.recipientName || user?.username}
          initialType={selectedCert.certType}
        />
      )}
    </div>
  );
};

export default MyCertificates;

