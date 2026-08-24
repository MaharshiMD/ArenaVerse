/**
 * Helper to build a flexible RegExp for game title searches.
 * Handles slashes (e.g. "BGMI / PUBG Mobile") and parenthetical aliases (e.g. "Battlegrounds Mobile India (BGMI)").
 */
const buildGameRegex = (gameInput) => {
  if (!gameInput || gameInput === 'all') return null;
  const rawParts = [];

  // Split by slash first e.g. "BGMI / PUBG Mobile"
  const slashParts = gameInput.split('/').map(s => s.trim()).filter(Boolean);
  for (const sp of slashParts) {
    rawParts.push(sp);
    // Extract parenthetical text if any e.g. "Battlegrounds Mobile India (BGMI)"
    const match = sp.match(/(.*?)\((.*?)\)/);
    if (match) {
      if (match[1].trim()) rawParts.push(match[1].trim());
      if (match[2].trim()) rawParts.push(match[2].trim());
    }
  }

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const uniqueParts = Array.from(new Set(rawParts.map(s => escapeRegex(s.trim())).filter(Boolean)));
  if (uniqueParts.length === 0) return null;
  return new RegExp(uniqueParts.join('|'), 'i');
};

module.exports = {
  buildGameRegex,
};
