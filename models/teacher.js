const db = require('../config/database');
const enToFaDictionary = require('../locales/dictionary/en-fa.json');
const faToEnDictionary = require('../locales/dictionary/fa-en.json');

// فانکشن ترجمه کلمه‌به‌کلمه
function translateText(text, targetLang) {
    if (!text) return '';
    const dictionary = targetLang === 'fa' ? enToFaDictionary : faToEnDictionary;
    const words = text.toLowerCase().split(/\s+/);
    return words.map(word => dictionary[word] || word).join(' ');
}

class Teacher {
    // گرفتن لیست تیچرها با فیلترها
    static async getTeachers({ isAdmin = false, search = '', minRating = 0, limit = 10, offset = 0, lang = 'en' }) {
        let sql = `
            SELECT u.id, u.username, u.first_name, u.last_name, u.rating, p.bio, p.translated_bio,
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
            sql += ` GROUP BY u.id, p.bio, p.translated_bio HAVING courseCount > 0`;
        } else {
            sql += ` GROUP BY u.id, p.bio, p.translated_bio`;
        }
        
        sql += ` ORDER BY u.rating DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const teachers = await db.allQuery(sql, params);
        
        // ترجمه bio بر اساس زبان درخواست
        teachers.forEach(teacher => {
            teacher.bio = lang === 'fa' && teacher.translated_bio ? teacher.translated_bio : translateText(teacher.bio, lang);
        });
        
        return teachers;
    }

    // اضافه کردن تیچر جدید
    static async addTeacher(teacherData) {
        teacherData.userType = 'teacher';
        const userId = await require('./user').create(teacherData);
        
        // اگر bio وجود داره، نسخه ترجمه‌شده رو ذخیره کن
        if (teacherData.bio) {
            const translatedBio = translateText(teacherData.bio, 'fa'); // پیش‌فرض به پارسی
            await db.runQuery(
                'INSERT INTO user_profiles (user_id, bio, translated_bio) VALUES (?, ?, ?)',
                [userId, teacherData.bio, translatedBio]
            );
        } else {
            await db.runQuery(
                'INSERT INTO user_profiles (user_id, bio) VALUES (?, ?)',
                [userId, teacherData.bio || '']
            );
        }
        
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

    // گرفتن تیچر برای لندینگ
    static async getLandingTeachers(limit = 5, lang = 'en') {
        const sql = `
            SELECT u.id, u.first_name, u.last_name, u.rating, p.bio, p.translated_bio,
                   COUNT(c.id) as courseCount
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN courses c ON u.id = c.teacher_id
            WHERE u.user_type = 'teacher'
            GROUP BY u.id, p.bio, p.translated_bio
            HAVING courseCount > 0
            ORDER BY u.rating DESC
            LIMIT ?
        `;
        const teachers = await db.allQuery(sql, [limit]);
        
        // ترجمه bio بر اساس زبان
        teachers.forEach(teacher => {
            teacher.bio = lang === 'fa' && teacher.translated_bio ? teacher.translated_bio : translateText(teacher.bio, lang);
        });
        
        return teachers;
    }

    // گرفتن جزئیات تیچر
    static async getTeacherDetails(id, lang = 'en') {
        const sql = `
            SELECT u.id, u.username, u.first_name, u.last_name, u.phone, u.email, u.rating, p.bio, p.translated_bio,
                   COUNT(c.id) as courseCount
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN courses c ON u.id = c.teacher_id
            WHERE u.id = ? AND u.user_type = 'teacher'
            GROUP BY u.id, p.bio, p.translated_bio
        `;
        const teacher = await db.getQuery(sql, [id]);
        
        if (teacher) {
            teacher.bio = lang === 'fa' && teacher.translated_bio ? teacher.translated_bio : translateText(teacher.bio, lang);
        }
        
        return teacher;
    }
}

module.exports = Teacher;