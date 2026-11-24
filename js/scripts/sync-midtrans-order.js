'use strict';
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { sequelize } = require('../src/models');
const { reconcileByOrder } = require('../src/services/tokenCheckout');
const main = async () => {
  const orderId = process.argv[2];
  if (process.argv.length !== 3 || !/^SOA-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(orderId || '')) {
    throw new Error('Pemakaian dari folder utama: node js/scripts/sync-midtrans-order.js SOA-UUID-ORDER');
  }
  const result = await reconcileByOrder({ orderId });
  if (!result.provider_found) {
    throw new Error('Order belum ditemukan di Midtrans pada environment/key ini. Status lokal tidak diubah.');
  }
  console.log(`Order: ${orderId}\nStatus lokal: ${result.purchase.status}\nKuota dikreditkan pada proses ini: ${result.granted ? 'ya' : 'tidak (belum lunas atau sudah pernah dikreditkan)'}`);
};
main().catch((error) => {
  console.error('[sync-midtrans]', error.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
