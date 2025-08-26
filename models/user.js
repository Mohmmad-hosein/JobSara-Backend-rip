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

    try {
      // هش کردن رمز عبور
      const hashedPassword = await bcrypt.hash(password, 12);

      const sql = `INSERT INTO users (
        username, email, password, first_name, last_name, phone, 
        user_type, company_name, resume, skills, experience_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const result = await db.runQuery(sql, [
        username,
        email,
        hashedPassword,
        firstName,
        lastName,
        phone || null,
        userType,
        companyName || null,
        resume || null,
        skills || null,
        experienceLevel || null
      ]);

      return result.lastID;
    } catch (error) {
      console.error('Error in User.create:', error);
      throw error;
    }
  }

  // پیدا کردن کاربر بر اساس ایمیل
  static findByEmail(email) {
    return db.getQuery('SELECT * FROM users WHERE email = ?', [email]);
  }

  // پیدا کردن کاربر بر اساس نام کاربری
  static findByUsername(username) {
    return db.getQuery('SELECT * FROM users WHERE username = ?', [username]);
  }

  // پیدا کردن کاربر بر اساس ID
  static findById(id) {
    return db.getQuery('SELECT * FROM users WHERE id = ?', [id]);
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
    return new Promise(async (resolve, reject) => {
      try {
        const fields = [];
        const values = [];

        // مپ کردن فیلدها به فرمت دیتابیس
        const fieldMap = {
          'firstName': 'first_name',
          'lastName': 'last_name',
          'userType': 'user_type',
          'companyName': 'company_name',
          'experienceLevel': 'experience_level'
        };

        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && updateData[key] !== null) {
            const dbField = fieldMap[key] || key;
            fields.push(`${dbField} = ?`);
            values.push(updateData[key]);
          }
        });

        if (fields.length === 0) {
          resolve(0);
          return;
        }

        values.push(id);
        
        const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
        
        const result = await db.runQuery(sql, values);
        resolve(result.changes);
      } catch (error) {
        reject(error);
      }
    });
  }

  // حذف کاربر
  static delete(id) {
    return db.runQuery('DELETE FROM users WHERE id = ?', [id])
      .then(result => result.changes);
  }

  // گرفتن همه کاربران (با pagination)
  static getAll(limit = 10, offset = 0) {
    return db.allQuery(
      'SELECT id, username, email, first_name, last_name, user_type, created_at FROM users LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  // گرفتن آمار کاربران بر اساس نقش
  static getUserStats() {
    return new Promise(async (resolve, reject) => {
      try {
        const sql = `
          SELECT 
            user_type,
            COUNT(*) as count
          FROM users 
          GROUP BY user_type
        `;
        
        const rows = await db.allQuery(sql);
        
        // مقدار پیش‌فرض برای هر نقش
        const stats = {
          total: 0,
          job_seeker: 0,
          intern: 0,
          employer: 0,
          admin: 0,
          teacher: 0
        };
        
        // محاسبه مجموع و تعداد هر نقش
        rows.forEach(row => {
          stats.total += row.count;
          stats[row.user_type] = row.count;
        });
        
        resolve(stats);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ذخیره توکن در دیتابیس
  static saveToken(userId, token, expiresAt) {
    return db.runQuery(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    ).then(result => result.lastID);
  }

  // بررسی اعتبار توکن
static async validateToken(token) {
    try {
      // اول توکن JWT را verify کنید
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // سپس وجود توکن در دیتابیس را بررسی کنید
      const session = await db.getQuery(
        'SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime("now") AND user_id = ?',
        [token, decoded.userId]
      );
      
      return session;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }
  // حذف توکن
  static deleteToken(token) {
    return db.runQuery(
      'DELETE FROM user_sessions WHERE token = ?',
      [token]
    ).then(result => result.changes);
  }

  // حذف همه توکن‌های کاربر
  static deleteAllUserTokens(userId) {
    return db.runQuery(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [userId]
    ).then(result => result.changes);
  }
}

module.exports = User;