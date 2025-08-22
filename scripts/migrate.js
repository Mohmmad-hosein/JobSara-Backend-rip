const db = require('../config/database');

console.log('Running database migrations...');

// این فایل فقط برای اطمینان از ایجاد جداول است
// عملیات اصلی در config/database.js انجام می‌شود

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database migration completed successfully');
  }
});