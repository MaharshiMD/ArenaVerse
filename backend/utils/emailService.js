const nodemailer = require('nodemailer');

// Configure Nodemailer Transporter
const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  // Fallback to test account or stream transport for development
  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"ArenaVerse Esports" <${process.env.SMTP_USER || 'no-reply@arenaverse.com'}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL DISPATCH] Subject: "${subject}" -> To: ${to}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
    return null;
  }
};

// 1. Welcome & Registration Email
const sendRegistrationEmail = async (user) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h1 style="color: #8b5cf6;">Welcome to ArenaVerse, @${user.username}! 🎮</h1>
      <p style="color: #94a3b8; font-size: 16px;">Your competitor account has been successfully registered.</p>
      <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Username:</strong> @${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
      </div>
      <p style="color: #94a3b8;">Explore championship tournaments, build squad teams, and climb global leaderboards!</p>
      <footer style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; color: #64748b; font-size: 12px;">
        © 2026 ArenaVerse Esports Platform. All rights reserved.
      </footer>
    </div>
  `;
  return await sendEmail({ to: user.email, subject: '🎮 Welcome to ArenaVerse Esports!', html });
};

// 2. Team Squad Invitation Email
const sendTeamInvitationEmail = async (inviterName, inviteeEmail, teamName) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #3b82f6;">🛡️ Squad Team Invitation</h2>
      <p style="color: #cbd5e1; font-size: 16px;"><strong>@${inviterName}</strong> has invited you to join their squad team <strong>"${teamName}"</strong> on ArenaVerse.</p>
      <div style="margin: 25px 0;">
        <a href="http://localhost:5173/player-dashboard" style="background-color: #8b5cf6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Team Invite</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Join your teammates to communicate in real-time squad chat and compete in team tournaments.</p>
    </div>
  `;
  return await sendEmail({ to: inviteeEmail, subject: `🛡️ You've been invited to join Team "${teamName}"`, html });
};

// 3. Tournament Invitation Email
const sendTournamentInvitationEmail = async (organizerName, inviteeEmail, tournament) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #f59e0b;">🏆 Tournament Challenge Invitation</h2>
      <p style="color: #cbd5e1; font-size: 16px;">Organizer <strong>@${organizerName}</strong> invited you to compete in <strong>${tournament.name}</strong>!</p>
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Game:</strong> ${tournament.game}</p>
        <p><strong>Prize Pool:</strong> ₹${(tournament.prizePool || 0).toLocaleString('en-IN')}</p>
        <p><strong>Entry Fee:</strong> ${tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'FREE ENTRY'}</p>
        <p><strong>Start Date:</strong> ${new Date(tournament.startDate).toLocaleString()}</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="http://localhost:5173/tournaments/${tournament._id}" style="background-color: #f59e0b; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Tournament & Register</a>
      </div>
    </div>
  `;
  return await sendEmail({ to: inviteeEmail, subject: `🏆 Tournament Invitation: ${tournament.name}`, html });
};

// 4. Payment Receipt Email
const sendPaymentReceiptEmail = async (userEmail, payment) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #10b981;">💳 Payment Receipt & Confirmation</h2>
      <p style="color: #cbd5e1;">Thank you! Your payment for tournament registration has been processed successfully.</p>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Transaction ID:</strong> ${payment.paymentId || payment.orderId || 'TXN_' + Date.now()}</p>
        <p><strong>Tournament:</strong> ${payment.tournamentName || 'ArenaVerse Tournament'}</p>
        <p><strong>Amount Paid:</strong> ₹${payment.amount}</p>
        <p><strong>Status:</strong> COMPLETED ✅</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Good luck in your upcoming matches!</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject: `💳 Payment Receipt: ₹${payment.amount} for ${payment.tournamentName || 'Tournament'}`, html });
};

// 5. Match Schedule Reminder Email
const sendMatchReminderEmail = async (playerEmail, match, tournamentName) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #ef4444;">⏰ Upcoming Match Check-In Reminder</h2>
      <p style="color: #cbd5e1;">Your match in <strong>${tournamentName}</strong> is starting soon!</p>
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Matchup:</strong> ${match.teamAName || 'Team A'} vs ${match.teamBName || 'Team B'}</p>
        <p><strong>Round:</strong> ${match.round}</p>
        <p><strong>Action Required:</strong> Players must check in before deadline to prevent automatic walkover.</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="http://localhost:5173/tournaments/${match.tournament}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Check In Now</a>
      </div>
    </div>
  `;
  return await sendEmail({ to: playerEmail, subject: `⏰ Match Reminder: ${tournamentName} Round ${match.round}`, html });
};

// 6. Password Reset Token Email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; background-color: #0f111a; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #8b5cf6;">🔐 Password Reset Request</h2>
      <p style="color: #cbd5e1;">We received a request to reset your ArenaVerse account password.</p>
      <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="font-size: 14px; color: #94a3b8;">Your Password Reset Token / Verification Code:</p>
        <h1 style="color: #8b5cf6; font-size: 32px; letter-spacing: 4px; margin: 10px 0;">${resetToken}</h1>
      </div>
      <p style="color: #64748b; font-size: 12px;">If you did not request this password reset, please ignore this email.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject: '🔐 Password Reset Token - ArenaVerse', html });
};

// 7. 2FA Email OTP Verification Email
const send2FAOTPEmail = async (userEmail, otpCode) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`\n==================================================`);
    console.log(`🛡️ [ARENAVERSE 2FA DEV OTP CODE]`);
    console.log(`To: ${userEmail}`);
    console.log(`Verification Code:  >>>> ${otpCode} <<<<`);
    console.log(`(Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env to send real email to your inbox)`);
    console.log(`==================================================\n`);
  }

  const html = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #0f111a; color: #ffffff; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid rgba(139, 92, 246, 0.2);">
      <h1 style="color: #8b5cf6; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">ArenaVerse</h1>
      
      <p style="color: #e2e8f0; font-size: 16px; margin: 20px 0 10px 0;">Your verification code is:</p>
      
      <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; color: #a78bfa; font-size: 38px; font-weight: bold; letter-spacing: 8px;">${otpCode}</span>
      </div>
      
      <p style="color: #cbd5e1; font-size: 14px; margin: 15px 0;">This code will expire in <strong>5 minutes</strong>.</p>
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 20px 0 15px 0;">
        If you did not attempt to sign in to ArenaVerse, please ignore this email and consider changing your password if you believe your account may be compromised.
      </p>
      
      <p style="color: #f43f5e; font-size: 13px; font-weight: 600; margin: 15px 0 0 0;">
        Do not share this code with anyone.
      </p>

      <footer style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; color: #64748b; font-size: 12px;">
        © 2026 ArenaVerse Esports Management. Secure Authentication Service.
      </footer>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject: 'Your ArenaVerse Verification Code', html });
};

module.exports = {
  sendRegistrationEmail,
  sendTeamInvitationEmail,
  sendTournamentInvitationEmail,
  sendPaymentReceiptEmail,
  sendMatchReminderEmail,
  sendPasswordResetEmail,
  send2FAOTPEmail,
};
