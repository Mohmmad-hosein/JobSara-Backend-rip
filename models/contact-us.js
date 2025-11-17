const db = require('../config/database');

class ContactUs {
    static async create(data) {
        const { userId, title, describe } = data

        // sql 
        const sql = `INSERT INTO contactUs (userId, title, describe) VALUES (?, ?, ?)`

        try {
            const result = await db.runQuery(sql, [userId, title, describe])
            return result.lastID
        } catch (err) {
            console.log("Something went wrong: ", err)
            throw err
        }
    }

    // find a message by id
    static find(id) {
        return db.getQuery("SELECT * FROM contactUs WHERE id = ?", [id])
    }

    // delete a message by id
    static delete(id) {
        return db.runQuery('DELETE FROM contactUs WHERE id = ?', [id])
            .then(result => result.changes);
    }

    // get all message with pagination
    static getAll(limit = 10, offset = 0) {
        return db.allQuery(
            'SELECT id, title, describe FROM contactUs LIMIT ? OFFSET ?',
            [limit, offset]
        );
    }

}

module.exports = ContactUs;