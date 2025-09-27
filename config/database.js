const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// مسیر دیتابیس
const dbPath = path.join(__dirname, "..", "database.sqlite");

// اطمینان از وجود پوشه database
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("📁 Database directory created");
}

// تنظیمات connection برای جلوگیری از قفل شدن
const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("❌ Error opening database:", err.message);
    } else {
      console.log("✅ Connected to SQLite database");

      // تنظیم timeout برای جلوگیری از قفل شدن
      db.configure("busyTimeout", 3000);

      // فعال کردن foreign keys
      db.run("PRAGMA foreign_keys = ON", (err) => {
        if (err) {
          console.error("❌ Error setting foreign keys:", err.message);
        }
      });

      initializeDatabase();
    }
  }
);

// تابع برای مقداردهی اولیه دیتابیس
function initializeDatabase() {
  // ایجاد جدول users
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        user_type TEXT NOT NULL DEFAULT 'job_seeker',
        company_name TEXT,
        resume TEXT,
        skills TEXT,
        experience_level TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        CHECK (user_type IN ('job_seeker', 'intern', 'employer', 'admin', 'teacher'))
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating users table:", err.message);
      } else {
        console.log("✅ Users table ready");
      }
    }
  );

  // ایجاد جدول user_sessions برای توکن‌ها
  db.run(
    `CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating user_sessions table:", err.message);
      } else {
        console.log("✅ User sessions table ready");
      }
    }
  );

  db.run(`ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0.0`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("❌ Error adding rating to users:", err.message);
    } else {
      console.log("✅ Added rating to users table");
    }
  });

  // جدول courses برای دوره‌ها
  db.run(
    `CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE
)`,
    (err) => {
      if (err) {
        console.error("❌ Error creating courses table:", err.message);
      } else {
        console.log("✅ Courses table ready");
      }
    }
  );

db.run(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("❌ Error adding bio to users:", err.message);
    } else {
      console.log("✅ Added bio to users table");
    }
  });

db.run(`ALTER TABLE user_profiles ADD COLUMN translated_bio TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding translated_bio:', err.message);
    } else {
        console.log('✅ Added translated_bio');
    }
});

  // ایجاد سایر جداول با تاخیر برای جلوگیری از قفل شدن
  setTimeout(() => createAdditionalTables(), 100);
}

// برای courses (اگر description داره)
db.run(`ALTER TABLE courses ADD COLUMN translated_description TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding translated_description:', err.message);
    } else {
        console.log('✅ Added translated_description');
    }
});

// تابع برای ایجاد جداول اضافی با تاخیر
function createAdditionalTables() {
  // ایجاد جدول user_profiles
  db.run(
    `CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        bio TEXT,
        website TEXT,
        github_url TEXT,
        linkedin_url TEXT,
        twitter_url TEXT,
        education TEXT,
        work_experience TEXT,
        projects TEXT,
        certifications TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating user_profiles table:", err.message);
      } else {
        console.log("✅ User profiles table ready");
      }
    }
  );

  // ایجاد جدول jobs
  db.run(
    `CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        salary_range TEXT,
        employment_type TEXT,
        requirements TEXT,
        skills_required TEXT,
        experience_level TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating jobs table:", err.message);
      } else {
        console.log("✅ Jobs table ready");
      }
    }
  );

  // ایجاد جدول job_applications
  db.run(
    `CREATE TABLE IF NOT EXISTS job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        cover_letter TEXT,
        resume TEXT,
        status TEXT DEFAULT 'pending',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(job_id, user_id)
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating job_applications table:", err.message);
      } else {
        console.log("✅ Job applications table ready");
        console.log("🎉 All database tables initialized successfully");
      }
    }
  );
}

// تابع برای اجرای کوئری‌ها با خطایابی بهتر
db.runQuery = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) {
        console.error("Database query error:", err.message);
        console.error("SQL:", sql);
        console.error("Params:", params);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// تابع برای گرفتن یک رکورد
db.getQuery = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) {
        console.error("Database get error:", err.message);
        console.error("SQL:", sql);
        console.error("Params:", params);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// تابع برای گرفتن چندین رکورد
db.allQuery = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Database all error:", err.message);
        console.error("SQL:", sql);
        console.error("Params:", params);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// تابع برای بستن امن دیتابیس
db.closeDatabase = function () {
  return new Promise((resolve, reject) => {
    this.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
        reject(err);
      } else {
        console.log("Database connection closed");
        resolve();
      }
    });
  });
};

// هندل کردن بستن تمیز برنامه
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await db.closeDatabase();
  process.exit(0);
});

module.exports = db;
