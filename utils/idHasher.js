const Hashids = require('hashids');

const hashids = new Hashids(process.env.HASHIDS_SALT || 'fallback-salt', 10); // طول حداقل ۱۰ کاراکتر

module.exports = {
  // عدد → هش (برای نمایش در response و URL)
  encode(id) {
    if (!id || isNaN(id)) return null;
    return hashids.encode(id);
  },

  // هش → عدد (برای پیدا کردن در دیتابیس)
  decode(hashed) {
    if (!hashed) return null;
    const decoded = hashids.decode(hashed);
    return decoded.length > 0 ? Number(decoded[0]) : null;
  },
};