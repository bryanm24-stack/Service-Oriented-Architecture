const httpError = require('./httpError');
const isAdmin = (req) => req.user.role === 'admin';
const ownerWhere = (req, field = 'id_user') => (isAdmin(req) ? {} : { [field]: req.user.id });
const assertUserPath = (req, id) => {
  if (!isAdmin(req) && id !== req.user.id) throw httpError(404, 'Data tidak ditemukan');
};
const createOwner = (req, value, field = 'id_user') => {
  if (!isAdmin(req) && value[field] !== undefined && value[field] !== req.user.id)
    throw httpError(403, 'Pemilik tidak boleh ditentukan sebagai user lain');
  return isAdmin(req) && value[field] !== undefined ? value[field] : req.user.id;
};
const preserveOwner = (value, current, field = 'id_user') => {
  if (value[field] !== undefined && value[field] !== current)
    throw httpError(403, 'Pemilik data tidak boleh dipindahkan');
  delete value[field];
};
module.exports = { isAdmin, ownerWhere, assertUserPath, createOwner, preserveOwner };
