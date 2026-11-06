// Entry kompatibilitas. Seluruh route terpasang di aplikasi yang sama.
require('dotenv').config();
const app = require('./index');
app.listen(process.env.PORT || 3001, process.env.HOST || '127.0.0.1');
