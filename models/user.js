const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  // ایجاد کاربر جدید
  static async create(userData) {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
      companyName,
      resume,
      skills,
      experienceLevel
    } = userData;

    // هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(password, 12);

    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO users (
        username, email, password, first_name, last_name, phone, 
        user_type, company_name, resume, skills, experience_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.run(sql, [
        username,
        email,
        hashedPassword,
        firstName,
        lastName,
        phone,
        userType,
        companyName,
        resume,
        skills,
        experienceLevel
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // پیدا کردن کاربر بر اساس ایمیل
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // پیدا کردن کاربر بر اساس نام کاربری
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // پیدا کردن کاربر بر اساس ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // بررسی صحت رمز عبور
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // تولید توکن JWT
  static generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType: user.user_type 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  }

  // آپدیت کاربر
  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      values.push(id);
      
      const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // حذف کاربر
  static delete(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM users WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // گرفتن همه کاربران (با pagination)
  static getAll(limit = 10, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, first_name, last_name, user_type, created_at FROM users LIMIT ? OFFSET ?';
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // ذخیره توکن در دیتابیس
  static saveToken(userId, token, expiresAt) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)';
      db.run(sql, [userId, token, expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // بررسی اعتبار توکن
  static validateToken(token) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime("now")';
      db.get(sql, [token], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // حذف توکن
  static deleteToken(token) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM user_sessions WHERE token = ?';
      db.run(sql, [token], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = User;