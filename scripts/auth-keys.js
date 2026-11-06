const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const file = path.join(__dirname, '..', '.env');
let text = fs.existsSync(file)
  ? fs.readFileSync(file, 'utf8')
  : fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
if (/^JWT_ACCESS_SECRET=.{32,}$/m.test(text))
  console.log('JWT_ACCESS_SECRET sudah tersedia; tidak diubah.');
else {
  text = text.replace(/^JWT_ACCESS_SECRET=.*\r?\n?/m, '');
  fs.writeFileSync(
    file,
    text.trimEnd() + '\nJWT_ACCESS_SECRET=' + randomBytes(48).toString('hex') + '\n',
  );
  console.log('Konfigurasi JWT lokal disiapkan.');
}
