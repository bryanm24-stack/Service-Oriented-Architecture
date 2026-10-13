require('dotenv').config();

const { User, sequelize } = require('../src/models');
const { getUserPaymentStatus, getMidtransConfig } = require('../src/services/midtrans');
const { parse, idSchema } = require('../src/utils/validation/resourceSchemas');
const httpError = require('../src/utils/httpError');

const check = async () => {
    if (process.argv.length !== 3) {
        throw httpError(400, 'Pemakaian: npm run midtrans:check -- ID_USER');
    }

    const id = parse(idSchema, process.argv[2]);
    const { environment } = getMidtransConfig(id);
    const user = await User.findByPk(id);

    if (!user) throw httpError(404, 'User tidak ditemukan atau sudah dihapus');

    const payment = await getUserPaymentStatus(user.id);

    console.log(JSON.stringify({
        pemeriksaan: 'berhasil',
        environment,
        id_pengguna: user.id,
        pembayaran: payment
    }, null, 4));
};

check().catch(error => {
    const databaseError = error.name?.startsWith('SequelizeConnection');
    const status = databaseError ? 503 : error.expose === true ? error.status : 500;
    const message = databaseError ? 'Database belum dapat dihubungi'
        : error.expose === true ? error.message : 'Pemeriksaan Midtrans gagal';

    console.error(`[midtrans:check] Gagal (${status}): ${message}`);
    process.exitCode = 1;
}).finally(() => sequelize.close());
