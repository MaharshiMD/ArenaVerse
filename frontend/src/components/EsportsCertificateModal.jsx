import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Sparkles, FileText, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './EsportsCertificateModal.css';

// Helper function to format tournament result declare date (e.g. AUG. 13TH 2026)
const formatCertificateDate = (dateVal) => {
  if (!dateVal) return 'AUG. 13TH 2026';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal).toUpperCase();

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let suffix = 'TH';
  if (day === 1 || day === 21 || day === 31) suffix = 'ST';
  else if (day === 2 || day === 22) suffix = 'ND';
  else if (day === 3 || day === 23) suffix = 'RD';

  return `${month}. ${day}${suffix} ${year}`;
};

const EsportsCertificateModal = ({
  isOpen,
  onClose,
  tournament = {},
  initialWinnerName = 'MAHARSHI DIHORA',
  initialRunnerUpName = 'Team Omega',
  initialType = 'champion',
}) => {
  const { user } = useAuth();
  const [activeType] = useState(initialType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const certCanvasRef = useRef(null);

  const isRunnerUp = initialType === 'runnerup' || initialType === 'runner_up' || initialType === 'runner' || activeType === 'runnerup' || activeType === 'runner_up' || activeType === 'runner';
  const bgImageSrc = isRunnerUp ? '/images/RunnerUp_Certificate_Layout.png' : '/images/CERTIFICATE_LAYOUT.png';

  const defaultRecipient = isRunnerUp
    ? (initialRunnerUpName || tournament.runnerUpName || 'Team Omega')
    : (initialWinnerName || tournament.winnerName || 'MAHARSHI DIHORA');

  const [certData, setCertData] = useState({
    recipientName: defaultRecipient,
    tournamentName: tournament.name || 'Arena-Verse Tournament',
    gameName: tournament.game || 'BGMI',
    date: formatCertificateDate(tournament.completedAt || tournament.updatedAt || tournament.endDate),
    adminName: 'ARENA VERSE',
    certificateId: `AV-2025-CERT-01`,
  });

  // Automatically update certData when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const recipientNameResolved = isRunnerUp
        ? (initialRunnerUpName || tournament.runnerUpName || 'Team Omega')
        : (initialWinnerName || tournament.winnerName || tournament.winner?.username || (typeof tournament.winner === 'string' ? tournament.winner : null) || 'MAHARSHI DIHORA');
      const resultDateRaw = tournament.completedAt || tournament.updatedAt || tournament.endDate || tournament.date || Date.now();
      const formattedDate = formatCertificateDate(resultDateRaw);

      setCertData(prev => ({
        ...prev,
        recipientName: recipientNameResolved,
        tournamentName: tournament.name || prev.tournamentName || 'Arena-Verse Tournament',
        gameName: tournament.game || prev.gameName || 'BGMI',
        date: formattedDate,
      }));
    }
  }, [isOpen, tournament, initialWinnerName, initialRunnerUpName, initialType, isRunnerUp]);

  // Live Canvas Renderer for pixel-perfect preview matching exact export coordinates
  useEffect(() => {
    if (!isOpen) return;
    const canvas = certCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = bgImageSrc;

    img.onload = () => {
      const width = img.naturalWidth || 2000;
      const height = img.naturalHeight || 1414;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw Background Image
      ctx.drawImage(img, 0, 0, width, height);

      // Drop Shadow Helper
      const setShadow = (blur = 8, color = 'rgba(0, 0, 0, 0.85)', offsetY = 3) => {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = offsetY;
      };

      const nameText = certData.recipientName || 'MAHARSHI DIHORA';

      // 2. Title: "Certificate of Achievement"
      setShadow(12, 'rgba(0,0,0,0.9)', 4);
      ctx.fillStyle = '#E5C158';
      ctx.textAlign = 'center';
      ctx.font = `bold ${height * 0.062}px 'Cinzel', 'Times New Roman', serif`;
      ctx.fillText('Certificate of Achievement', width / 2, height * 0.350);

      // 3. Subtitle: "PRESENTED IN RECOGNITION OF EXCELLENCE"
      setShadow(6, 'rgba(0,0,0,0.9)', 2);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = `bold ${height * 0.015}px 'Helvetica Neue', Arial, sans-serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${height * 0.003}px`;
      }
      ctx.fillText('PRESENTED IN RECOGNITION OF EXCELLENCE', width / 2, height * 0.412);

      // 4. Winner Name (dynamic recipient name - bold)
      setShadow(14, 'rgba(0,0,0,0.95)', 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic 900 ${height * 0.072}px 'Cinzel', 'Times New Roman', serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '1px';
      }
      ctx.fillText(nameText, width / 2, height * 0.530);

      // 5. Description Text
      setShadow(4, 'rgba(0,0,0,0.9)', 2);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${height * 0.016}px 'Helvetica Neue', Arial, sans-serif`;

      const descText = certData.tournamentName && certData.tournamentName !== 'Arena-Verse Tournament'
        ? `For outstanding performance, exceptional skill, and distinguished achievement in competitive gaming and tournament excellence in ${certData.tournamentName} on the Arena Verse platform.`
        : `For outstanding performance, exceptional skill, and distinguished achievement in competitive gaming and tournament excellence on the Arena Verse platform.`;

      const wrapText = (text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => {
          ctx.fillText(l, x, startY + i * lineHeight);
        });
      };

      wrapText(descText, width / 2, height * 0.672, width * 0.78, height * 0.024);

      // 6. Bottom Left: Date Issued
      setShadow(4, 'rgba(0,0,0,0.9)', 2);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = `bold ${height * 0.015}px 'Helvetica Neue', Arial, sans-serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${height * 0.0015}px`;
      }
      ctx.fillText((certData.date || 'AUG. 13TH 2026').toUpperCase(), width * 0.23, height * 0.862);

      ctx.fillStyle = '#E5C158';
      ctx.font = `bold ${height * 0.011}px 'Helvetica Neue', Arial, sans-serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${height * 0.0025}px`;
      }
      ctx.fillText('DATE ISSUED', width * 0.23, height * 0.922);

      // 7. Bottom Right: ARENA VERSE Signatory
      setShadow(4, 'rgba(0,0,0,0.9)', 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic bold ${height * 0.016}px 'Cinzel', 'Times New Roman', serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '1px';
      }
      ctx.fillText(certData.adminName || 'ARENA VERSE', width * 0.77, height * 0.862);

      ctx.fillStyle = '#E5C158';
      ctx.font = `bold ${height * 0.011}px 'Helvetica Neue', Arial, sans-serif`;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${height * 0.0025}px`;
      }
      ctx.fillText('ARENA VERSE', width * 0.77, height * 0.922);
    };
  }, [isOpen, certData, bgImageSrc]);

  if (!isOpen) return null;

  const goldPrimary = '#E5C158';

  // High-Res PNG Download using live Canvas element
  const downloadPNG = () => {
    const canvas = certCanvasRef.current;
    if (!canvas) return;

    const nameText = certData.recipientName || 'MAHARSHI DIHORA';
    const downloadLink = document.createElement('a');
    downloadLink.download = `${nameText.replace(/\s+/g, '_')}_Certificate.png`;
    downloadLink.href = canvas.toDataURL('image/png');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // PDF Download endpoint handler with Bearer Token Authorization
  const handleDownloadPDF = async () => {
    try {
      if (tournament._id) {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/api/tournaments/${tournament._id}/certificate?type=${activeType}`;

        const res = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `PDF download failed with status ${res.status}`);
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        const recipientSanitized = (certData.recipientName || user?.username || 'Winner').replace(/[^a-zA-Z0-9]/g, '_');
        downloadLink.download = `ArenaVerse_Certificate_${recipientSanitized}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        downloadPNG();
      }
    } catch (err) {
      console.error('Error downloading PDF certificate:', err);
      alert(err.message || 'Error downloading certificate');
    }
  };

  return (
    <div className={`cert-modal-backdrop ${isFullscreen ? 'fullscreen-active' : ''}`}>
      <div className={`cert-modal-container ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Header */}
        <div className="cert-modal-header">
          <div className="cert-modal-title">
            <Sparkles size={20} style={{ color: goldPrimary }} />
            <span>Tournament Certificate</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body - Certificate Display Only */}
        <div className="cert-modal-body" style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px' }}>
          {/* CERTIFICATE DISPLAY WITH CERTIFICATE_LAYOUT.png AS BACKGROUND */}
          <div
            className="certificate-card"
            id="certContainer"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 'min(100%, calc((82vh - 130px) * 1.4144))',
              maxHeight: 'calc(82vh - 130px)',
              aspectRatio: '1.4144 / 1',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7)',
              backgroundColor: '#080a0f',
              margin: '0 auto'
            }}
          >
            <canvas
              ref={certCanvasRef}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius: '12px' }}
            />
          </div>

          {/* SINGLE DOWNLOAD BUTTON BELOW CERTIFICATE */}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', width: '100%', flexShrink: 0 }}>
            <button
              onClick={() => setShowFormatModal(true)}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                padding: '14px 36px',
                fontSize: '16px',
                fontWeight: '700',
                borderRadius: '30px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <Download size={20} />
              <span>Download Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {/* DOWNLOAD FORMAT PICKER POPUP DIALOG */}
      {showFormatModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
          onClick={() => setShowFormatModal(false)}
        >
          <div
            style={{
              backgroundColor: '#141724',
              border: '1px solid rgba(229, 193, 88, 0.35)',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', fontWeight: 700 }}>
                Select Download Format
              </h3>
              <button
                onClick={() => setShowFormatModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              Choose your preferred format to download the certificate:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {/* PNG OPTION */}
              <button
                onClick={() => {
                  downloadPNG();
                  setShowFormatModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa' }}>
                    <Image size={22} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>PNG Image</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>High-resolution image file</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 700 }}>.PNG</span>
              </button>

              {/* PDF OPTION */}
              <button
                onClick={() => {
                  handleDownloadPDF();
                  setShowFormatModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(229, 193, 88, 0.2)', color: '#E5C158' }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>PDF Document</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Official PDF document file</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#E5C158', fontWeight: 700 }}>.PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EsportsCertificateModal;


