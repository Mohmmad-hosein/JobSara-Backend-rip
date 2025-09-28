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
static async addTeacher(teacherData, profilePictureBuffer) {
    teacherData.userType = 'teacher';
    const userId = await require('./user').create(teacherData);
    
    let translatedBio = '';
    if (teacherData.bio) {
        translatedBio = translateText(teacherData.bio, 'fa');
    }
    
    await db.runQuery(
        'INSERT INTO user_profiles (user_id, bio, translated_bio, profile_picture) VALUES (?, ?, ?, ?)',
        [userId, teacherData.bio || '', translatedBio, profilePictureBuffer || null]
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
        SELECT u.id, u.username, u.first_name, u.last_name, u.phone, u.email, u.rating, p.bio, p.translated_bio, p.profile_picture,
               COUNT(c.id) as courseCount
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN courses c ON u.id = c.teacher_id
        WHERE u.id = ? AND u.user_type = 'teacher'
        GROUP BY u.id, p.bio, p.translated_bio, p.profile_picture
    `;
    const teacher = await db.getQuery(sql, [id]);
    
    if (teacher) {
        teacher.bio = lang === 'fa' && teacher.translated_bio ? teacher.translated_bio : translateText(teacher.bio, lang);
        if (teacher.profile_picture) {
            teacher.profile_picture = `data:image/jpeg;base64,${teacher.profile_picture.toString('base64')}`; // تبدیل به base64 برای نمایش
        }
    }
    
    return teacher;
}
}

module.exports = Teacher;