const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates the Official ArenaVerse eSports Certificate matching CERTIFICATE_LAYOUT.png:
 * - Dimensions: 3508 x 2480 px (A4 Landscape 300 DPI High-Res Format)
 * - Background Image: CERTIFICATE_LAYOUT.png
 * - Title: "Certificate of Achievement"
 * - Subtitle: "PRESENTED IN RECOGNITION OF EXCELLENCE"
 * - Recipient: Dynamic Recipient Name / Winner Name in white italic serif
 * - Citation: "For outstanding performance, exceptional skill, and distinguished achievement in competitive gaming..."
 * - Bottom Row: Date Issued (left), ARENA VERSE (right)
 */
const generateCertificateStream = ({
  res,
  recipientName = 'MAHARSHI DIHORA',
  tournamentName = 'Arena-Verse Tournament',
  gameTitle = 'BGMI',
  type = 'champion',
  placementText = '',
  prizeWon = 0,
  dateString = null,
  certificateId = 'AV-2025-CERT-01',
  adminName = 'ARENA VERSE',
}) => {
  const dVal = dateString && dateString !== 'JAN. 1ST 2025' ? dateString : 'AUG. 13TH 2026';
  const doc = new PDFDocument({
    size: [3508, 2480],
    margin: 0,
  });

  const width = 3508;
  const height = 2480;

  const filename = `ArenaVerse_Certificate_${recipientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  if (res && res.setHeader) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  doc.pipe(res);

  const isRunnerUp = type === 'runnerup' || type === 'runner_up' || type === 'runner';
  const bgFileName = isRunnerUp ? 'RunnerUp_Certificate_Layout.png' : 'CERTIFICATE_LAYOUT.png';
  const bgPath = path.join(__dirname, '../assets', bgFileName);

  if (fs.existsSync(bgPath)) {
    // 1. Draw High-Res Master Background Image
    doc.image(bgPath, 0, 0, { width, height });
  } else {
    // Vector Fallback if background image file is missing
    doc.rect(0, 0, width, height).fill('#080A0F');
    doc.save();
    doc.lineWidth(8).strokeColor(goldPrimary).rect(70, 70, width - 140, height - 140).stroke();
    doc.lineWidth(3).strokeColor(goldDark).rect(94, 94, width - 188, height - 188).stroke();
    doc.restore();

    // Seal fallback
    const sealX = 1754;
    const sealY = 2080;
    doc.save();
    doc.lineWidth(6).strokeColor(goldPrimary).circle(sealX, sealY, 120).stroke();
    doc.circle(sealX, sealY, 100).fillColor(goldPrimary).fill();
    doc.restore();
  }

  // 2. Main Title: "Certificate of Achievement"
  doc.fontSize(155)
     .font('Times-Bold')
     .fillColor(goldPrimary)
     .text('Certificate of Achievement', 0, 805, { width, align: 'center' });

  // 3. Subtitle: "PRESENTED IN RECOGNITION OF EXCELLENCE"
  doc.fontSize(34)
     .font('Helvetica-Bold')
     .fillColor('#E2E8F0')
     .text('PRESENTED IN RECOGNITION OF EXCELLENCE', 0, 970, { width, align: 'center', characterSpacing: 8 });

  // 4. Winner Name (Dynamic Recipient / Winner Name - BOLD)
  doc.fontSize(170)
     .font('Times-BoldItalic')
     .fillColor('#FFFFFF')
     .text(recipientName, 0, 1215, { width, align: 'center' });

  // 5. Description Text
  const descriptionText = tournamentName && tournamentName !== 'Arena-Verse Tournament'
    ? `For outstanding performance, exceptional skill, and distinguished achievement in competitive gaming and tournament excellence in ${tournamentName} on the Arena Verse platform.`
    : `For outstanding performance, exceptional skill, and distinguished achievement in competitive gaming and tournament excellence on the Arena Verse platform.`;

  doc.fontSize(38)
     .font('Helvetica')
     .fillColor('#94A3B8')
     .text(descriptionText, 400, 1665, { width: width - 800, align: 'center', lineGap: 14 });

  // 6. Bottom Row Elements (Y: 2130 / 2280)
  // Bottom Left: Date Issued
  const dateX = 807;
  doc.fontSize(36)
     .font('Helvetica-Bold')
     .fillColor('#E2E8F0')
     .text(dVal.toUpperCase(), dateX - 300, 2130, { width: 600, align: 'center', characterSpacing: 4 });

  doc.fontSize(26)
     .font('Helvetica-Bold')
     .fillColor(goldPrimary)
     .text('DATE ISSUED', dateX - 300, 2280, { width: 600, align: 'center', characterSpacing: 6 });

  // Bottom Right: ARENA VERSE / Admin Signatory
  const sigX = 2700;
  doc.fontSize(38)
     .font('Times-Italic')
     .fillColor('#FFFFFF')
     .text(adminName, sigX - 300, 2130, { width: 600, align: 'center' });

  doc.fontSize(26)
     .font('Helvetica-Bold')
     .fillColor(goldPrimary)
     .text('ARENA VERSE', sigX - 300, 2280, { width: 600, align: 'center', characterSpacing: 6 });

  // End PDF Stream
  doc.end();
};

module.exports = {
  generateCertificateStream,
};

