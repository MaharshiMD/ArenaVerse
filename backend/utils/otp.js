const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric OTP code.
 * Uses crypto.randomInt (never Math.random).
 */
const generateNumericOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash plaintext OTP using SHA-256 digest.
 */
const hashOTP = (otp) => {
  if (!otp) return '';
  return crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
};

/**
 * Perform constant-time verification of submitted OTP against stored SHA-256 hash.
 */
const verifyOTP = (submittedOtp, storedHash) => {
  if (!submittedOtp || !storedHash) return false;
  const submittedHash = hashOTP(submittedOtp);
  try {
    const bufA = Buffer.from(submittedHash, 'utf-8');
    const bufB = Buffer.from(storedHash, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    return false;
  }
};

/**
 * Mask email address for safe public/frontend display (e.g. m******@gmail.com).
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return 'e***@domain.com';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  const visiblePrefix = localPart.slice(0, 2);
  const maskedLocal = visiblePrefix + '*'.repeat(Math.max(3, localPart.length - 2));
  return `${maskedLocal}@${domain}`;
};

module.exports = {
  generateNumericOTP,
  hashOTP,
  verifyOTP,
  maskEmail,
};
