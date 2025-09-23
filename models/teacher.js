const db = require('../config/database');

class Teacher {
    // گرفتن لیست تیچرها با فیلترها
    static async getTeachers({ isAdmin = false, search = '', minRating = 0, limit = 10, offset = 0 }) {
        let sql = `
            SELECT u.id, u.username, u.first_name, u.last_name, u.rating, p.bio,
                   COUNT(c.id) as courseCount
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN courses c ON u.id = c.teacher_id
            WHERE u.user_type = 'teacher'
        `;
        
        const params = [];
        
        if (search) {
            sql += ` AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (minRating > 0) {
            sql += ` AND u.rating >= ?`;
            params.push(minRating);
        }
        
        if (!isAdmin) {
            // برای کاربران عادی: فقط تیچرهایی که حداقل یک دوره دارن
            sql += ` GROUP BY u.id, p.bio HAVING courseCount > 0`;
        } else {
            // برای ادمین: همه، حتی بدون دوره
            sql += ` GROUP BY u.id, p.bio`;
        }
        
        sql += ` ORDER BY u.rating DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        return db.allQuery(sql, params);
    }

    // اضافه کردن تیچر جدید (در اصل ثبت‌نام user با type teacher)
static async addTeacher(teacherData) {
    teacherData.userType = 'teacher';
    const userId = await require('./user').create(teacherData);
    // اضافه کردن پروفایل اولیه
    await db.runQuery(
        'INSERT INTO user_profiles (user_id, bio) VALUES (?, ?)',
        [userId, teacherData.bio || 'Teacher bio']
    );
    return userId;
}

    // حذف تیچر
    static async deleteTeacher(id) {
        const user = await require('./user').findById(id);
        if (user && user.user_type === 'teacher') {
            return require('./user').delete(id);
        }
        return 0;
    }

    // گرفتن تیچر برای لندینگ (مشخصات کمتر)
    static async getLandingTeachers(limit = 5) {
        const sql = `
            SELECT u.id, u.first_name, u.last_name, u.rating, p.bio,
                   COUNT(c.id) as courseCount
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN courses c ON u.id = c.teacher_id
            WHERE u.user_type = 'teacher'
            GROUP BY u.id, p.bio
            HAVING courseCount > 0
            ORDER BY u.rating DESC
            LIMIT ?
        `;
        return db.allQuery(sql, [limit]);
    }

    // گرفتن جزئیات تیچر
    static async getTeacherDetails(id) {
        const sql = `
            SELECT u.id, u.username, u.first_name, u.last_name, u.phone, u.email, u.rating, p.bio,
                   COUNT(c.id) as courseCount
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN courses c ON u.id = c.teacher_id
            WHERE u.id = ? AND u.user_type = 'teacher'
            GROUP BY u.id, p.bio
        `;
        return db.getQuery(sql, [id]);
    }
}

module.exports = Teacher;