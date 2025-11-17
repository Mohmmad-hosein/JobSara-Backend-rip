const express = require('express');
const router = express.Router();
const { sendEmail } = require('../email');  // اگر لازم باشه ایمپورت کن
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');


// API برای ثبت نام کاربر جدید
router.post("/api/register", async (req, res) => {
  try {
    console.log("Registration request received:", req.body);

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
      companyName,
      skills,
      experienceLevel,
    } = req.body;

    // بررسی فیلدهای اجباری
    if (
      !username ||
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !userType
    ) {
      return res.status(400).json({
        success: false,
        message: req.t("Missing required fields"),
      });
    }

    // بررسی نقش معتبر
    const validRoles = ["job_seeker", "intern", "employer", "admin", "teacher"];
    if (!validRoles.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: req.t(
          `Invalid user type. Valid types are: ${validRoles.join(", ")}`
        ),
      });
    }

    // بررسی اینکه کاربر با این ایمیل قبلاً ثبت نام نکرده باشد
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: req.t("User with this email already exists"),
      });
    }

    // بررسی اینکه نام کاربری تکراری نباشد
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: req.t("Username already taken"),
      });
    }

    // ایجاد کاربر جدید
    const userId = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
      companyName: companyName || "",
      skills: skills || "",
      experienceLevel: experienceLevel || "Beginner",
    });

    console.log("User created with ID:", userId);

    // گرفتن اطلاعات کاربر ایجاد شده
    const newUser = await User.findById(userId);

    // تشخیص زبان از هدر Accept-Language (شبیه به نمونه کدت)
    const acceptLang =
      req.headers["accept-language"]?.split(",")[0]?.trim() || "en";
    const lang = acceptLang.startsWith("fa") ? "fa" : "en";

    // ذخیره زبان اگر وجود نداشته باشه
    if (!newUser.language) {
      await User.update(newUser.id, { language: lang });
      newUser.language = lang;
    }

    // تنظیم زبان برای i18next
    req.i18n.changeLanguage(newUser.language || "en");

    // محتوای ایمیل بر اساس زبان
    let htmlContent;
    if (newUser.language === "fa") {
      htmlContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>خوش‌آمدگویی به جابسرا</title>
          <style>
              body { font-family: 'Bnazanin', sans-serif; background-color: #f4f4f4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);border: 1px solid #1f1f1fff; }
              .header { background-color: #1E3A8A; color: white; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; text-align: center; }
              .button { background-color: #38BDF8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;color: #ffffffff; font-weight: bold; margin-top: 20px; }
              .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>خوش‌آمدگویی به جابسرا!</h1>
              </div>
              <div class="content">
                  <p>سلام <strong>${newUser.first_name} ${newUser.last_name}</strong> عزیز،</p>
                  <p>ثبت‌نامت با موفقیت انجام شد. حالا می‌تونی وارد بشی:</p>
                  <a href="https://jobsara.com/login" class="button">ورود به سایت</a>
                  <p>اگر سوالی داشتی، با ما تماس بگیر!</p>
              </div>
              <div class="footer">
                  <p>جابسرا - پلتفرم کاریابی و آموزش © 2025</p>
              </div>
          </div>
      </body>
      </html>
      `;
    } else {
      // نسخه انگلیسی
      htmlContent = `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to JobSara</title>
          <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #1f1f1f; }
              .header { background-color: #1E3A8A; color: white; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; text-align: center; }
              .button { background-color: #38BDF8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; color: #ffffff; font-weight: bold; margin-top: 20px; }
              .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Welcome to JobSara!</h1>
              </div>
              <div class="content">
                  <p>Hello <strong>${newUser.first_name} ${newUser.last_name}</strong>,</p>
                  <p>Your registration was successful. You can now log in:</p>
                  <a href="https://jobsara.com/login" class="button">Log in to the site</a>
                  <p>If you have any questions, contact us!</p>
              </div>
              <div class="footer">
                  <p>JobSara - Job Search and Education Platform © 2025</p>
              </div>
          </div>
      </body>
      </html>
      `;
    }

    // عنوان ایمیل هم بر اساس زبان
    const emailSubject = newUser.language === "fa" ? "خوش‌آمدگویی به جابسرا" : "Welcome to JobSara";

    // ارسال ایمیل خوش‌آمدگویی
    await sendEmail(newUser.email, emailSubject, htmlContent);

    // تولید توکن JWT
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        userType: newUser.user_type,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: req.t("User registered successfully"),
      userId: userId,
      token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        userType: newUser.user_type,
      },
    });
  } catch (error) {
    console.error("Registration error details:", error);
    res.status(500).json({
      success: false,
      message:
        req.t("Internal server error during registration") +
        ": " +
        error.message,
    });
  }
});

// API برای ورود کاربر
router.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // پیدا کردن کاربر بر اساس ایمیل
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: req.t("Invalid email or password"),
      });
    }

    // بررسی صحت رمز عبور
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: req.t("Invalid email or password"),
      });
    }

    // تولید توکن JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: req.t("Login successful"),
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error during login"),
    });
  }
});

// API برای خروج کاربر
router.post("/api/logout", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: req.t("Logout successful"),
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error during logout"),
    });
  }
});

router.post("/api/set-language", authenticateToken, async (req, res) => {
  try {
    const { language } = req.body;
    if (!["en", "fa"].includes(language)) {
      return res
        .status(400)
        .json({ success: false, message: req.t("Invalid language") });
    }

    // ذخیره زبان در پروفایل کاربر
    await User.update(req.user.id, { language });

    res.json({
      success: true,
      message: req.t("Language updated successfully"),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

module.exports = router;