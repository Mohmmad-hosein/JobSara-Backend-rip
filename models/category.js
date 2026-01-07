const db = require('../config/database');

class Category {
  // اضافه کردن کتگوری جدید
  static async create({ title, description, imageBuffer }) {
    const sql = `INSERT INTO categories (title, description, image) VALUES (?, ?, ?)`;
    const result = await db.runQuery(sql, [title, description || null, imageBuffer || null]);
    return result.lastID;
  }

  // لیست همه کتگوری‌ها
  static async getAll() {
    return await db.allQuery(`SELECT id, title, description FROM categories ORDER BY created_at DESC`);
  }

  // جزئیات یک کتگوری
  static async getById(id) {
    const category = await db.getQuery(
      `SELECT id, title, description, image FROM categories WHERE id = ?`,
      [id]
    );
    if (category && category.image) {
      category.image = `data:image/jpeg;base64,${category.image.toString('base64')}`;
    }
    return category;
  }

  // حذف کتگوری
  static async delete(id) {
    return await db.runQuery(`DELETE FROM categories WHERE id = ?`, [id])
      .then(result => result.changes);
  }
}

module.exports = Category;