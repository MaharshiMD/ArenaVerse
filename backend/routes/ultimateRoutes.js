const express = require('express');
const router = express.Router();
const {
  linkGameAccount,
  generateAICreativeAsset,
  getMerchItems,
  createMerchItem,
  buyMerchItem,
  deleteMerchItem,
  getAuditLogs,
  getHealthStatus,
} = require('../controllers/ultimateController');
const { protect, authorize } = require('../middleware/auth');

router.post('/link-account', protect, linkGameAccount);
router.post('/ai-creative-asset', protect, authorize('organizer', 'admin'), generateAICreativeAsset);
router.get('/merch', protect, getMerchItems);
router.post('/merch', protect, createMerchItem);
router.post('/merch/:id/buy', protect, buyMerchItem);
router.delete('/merch/:id', protect, deleteMerchItem);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.get('/health', protect, authorize('organizer', 'admin'), getHealthStatus);

module.exports = router;
