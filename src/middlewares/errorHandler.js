module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const code = err.original?.code || err.parent?.code || err.code;

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            msg: 'Body bukan JSON yang valid'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            msg: 'Body melebihi batas ukuran'
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError' || code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            msg: 'Data dengan nilai unik tersebut sudah ada'
        });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
            msg: 'Data masih digunakan atau referensi tidak tersedia'
        });
    }

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            msg: 'Validasi gagal',
            errors: err.errors.map(item => ({
                field: item.path || '_model',
                message: `${item.path || '_model'} tidak valid`
            }))
        });
    }

    if (err.status === 400 && Array.isArray(err.details)) {
        return res.status(400).json({
            msg: 'Validasi gagal',
            errors: err.details
        });
    }

    if (err.expose === true && [400, 404, 409, 502, 503, 504].includes(err.status)) {
        return res.status(err.status).json({
            msg: err.message
        });
    }

    if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR'].includes(code)
    || err.name?.startsWith('SequelizeConnection')) {
        return res.status(503).json({
            msg: 'Database belum dapat dihubungi'
        });
    }

    console.error('[ERROR] Kesalahan internal server');

    return res.status(500).json({
        msg: 'Terjadi kesalahan pada server'
    });
};
