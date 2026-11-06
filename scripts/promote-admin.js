require('dotenv').config();
const { User, sequelize } = require('../src/models');
(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email || process.argv.length !== 3)
    throw Error('Pemakaian: npm run user:admin -- email-akun-yang-dipercaya');
  const user = await User.findOne({ where: { email } });
  if (!user) throw Error('Daftarkan akun melalui aplikasi terlebih dahulu.');
  await user.update({ role: 'admin' });
  console.log('Role admin disimpan untuk user ID ' + user.id + '.');
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
