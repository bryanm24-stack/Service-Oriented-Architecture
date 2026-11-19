const crypto = require('node:crypto');
const { ApiClient, ApiTier, ApiLog } = require('../models');
const httpError = require('../utils/httpError');

const verifyOwnedApiKey = async (req, res, next) => {
  try {
    const raw = req.get('X-API-Key');
    if (!raw || raw.length < 32 || raw.length > 160) throw httpError(401, 'API key AI tidak tersedia atau tidak valid');
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const client = await ApiClient.findOne({ where: { key_hash: keyHash, user_id: req.user.id, is_active: true, revoked_at: null }, include: [{ model: ApiTier, as: 'api_tier', where: { is_active: true } }] });
    if (!client) throw httpError(403, 'API key tidak dimiliki akun ini atau sudah dicabut');
    req.aiClient = client;
    const tier = client.api_tier;
    const since = new Date(Date.now() - Number(tier.window_seconds) * 1000);
    const used = await ApiLog.count({ where: { api_client_id: client.id, created_at: { [require('sequelize').Op.gte]: since } } });
    if (used >= Number(tier.rate_limit)) {
      await ApiLog.create({ api_client_id: client.id, endpoint: req.path, request_method: req.method, status_code: 429 });
      throw httpError(429, 'Batas permintaan AI tercapai. Tunggu sebelum mencoba lagi.');
    }
    const log = await ApiLog.create({ api_client_id: client.id, endpoint: req.path, request_method: req.method, status_code: 0 });
    res.once('finish', () => { ApiLog.update({ status_code: res.statusCode }, { where: { id: log.id } }).catch(() => {}); });
    next();
  } catch (error) { next(error); }
};
module.exports = { verifyOwnedApiKey };
