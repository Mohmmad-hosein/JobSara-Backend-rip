const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // اضافه شد برای هش کردن پسورد جدید
const { sendEmail } = require('../email');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middlewares/auth');
const { decode, encode } = require("../utils/idHasher");

// مرحله ۱ ثبت‌نام: ایجاد کاربر موقت + ارسال کد تأیید
router.post("/api/register/step1", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, userType } = req.body;

    if (!username || !email || !password || !firstName || !lastName || !userType) {
      return res.status(400).json({
        success: false,
        message: req.t("Missing required fields"),
      });
    }

    const validRoles = ["job_seeker", "intern", "employer", "admin", "teacher"];
    if (!validRoles.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: req.t(`Invalid user type. Valid types are: ${validRoles.join(", ")}`),
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: req.t("User with this email already exists"),
      });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: req.t("Username already taken"),
      });
    }

    // ایجاد کاربر (is_verified = 0 به صورت پیش‌فرض)
    const userId = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
    });

    // تولید و ارسال کد تأیید
    const code = User.generateVerificationCode();
    await User.saveVerificationToken(userId, code, 'registration');

    const lang = req.headers["accept-language"]?.startsWith("fa") ? "fa" : "en";

    const htmlContent = lang === "fa" ? `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>کد تأیید جابسرا</title>
        <style>
          body { font-family: sans-serif; background:#01010126; padding:20px; }
          .container { max-width:600px; margin:auto; background:white; border-radius:8px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
          .header { background:#1E3A8A; color:white; padding:15px; text-align:center; border-radius:8px 8px 0 0; }
          .content { padding:20px; text-align:center; }
          .code { background:#38BDF8; color:white; padding:10px 20px; display:inline-block; border-radius:4px; letter-spacing:5px; font-size:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>کد تأیید حساب</h1>
          </div>
          <div class="content">
            <p>سلام <strong>${firstName} ${lastName}</strong>،</p>
            <p>کد تأیید شما:</p>
            <div class="code">${code}</div>
            <p>این کد تا ۱۰ دقیقه معتبر است.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Verification Code - JobSara</title>
        <style>
          body { font-family: Arial, sans-serif; background:#01010126; padding:20px; }
          .container { max-width:600px; margin:auto; background:white; border-radius:8px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
          .header { background:#1E3A8A; color:white; padding:15px; text-align:center; border-radius:8px 8px 0 0; }
          .content { padding:20px; text-align:center; }
          .code { background:#38BDF8; color:white; padding:10px 20px; display:inline-block; border-radius:4px; letter-spacing:5px; font-size:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Verification Code</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
            <p>Your verification code:</p>
            <div class="code">${code}</div>
            <p>This code is valid for 10 minutes.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(email, lang === "fa" ? "کد تأیید جابسرا" : "JobSara Verification Code", htmlContent);

    res.json({
      success: true,
      message: req.t("Verification code sent"),
      hashedId: encode(userId),
    });
  } catch (error) {
    console.error("Register step1 error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});

// مرحله ۲: تأیید کد و فعال‌سازی + ارسال ایمیل خوش‌آمدگویی + لاگین
router.post("/api/register/verify", async (req, res) => {
  try {
    const { userId, code } = req.body;

    const validToken = await User.getValidVerificationToken(userId, code, 'registration');
    if (!validToken) {
      return res.status(400).json({
        success: false,
        message: req.t("Invalid or expired code"),
      });
    }

    await User.verifyUser(userId);
    await User.deleteVerificationToken(userId, 'registration');

    const user = await User.findById(userId);

    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // زبان کاربر (اگر ذخیره شده باشه) یا پیش‌فرض
    const lang = user.language || "en";
    req.i18n.changeLanguage(lang);

    // قالب کامل خوش‌آمدگویی (دقیقاً همون قالب قدیمی پروژه)
    const welcomeHtml = lang === "fa" ? `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>خوش‌آمدگویی به جابسرا</title>
          <style>
              body { font-family: 'Bnazanin', sans-serif; background-color: #01010126; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #1f1f1fff; }
              .header { background-color: #1E3A8A; color: white; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; text-align: center; }
              .button { background-color: #38BDF8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; color: #ffffffff; font-weight: bold; margin-top: 20px; }
              .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>خوش‌آمدگویی به جابسرا!</h1>
              </div>
              <div class="content">
                  <p>سلام <strong>${user.first_name} ${user.last_name}</strong> عزیز،</p>
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
    ` : `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to JobSara</title>
          <style>
              body { font-family: Arial, sans-serif; background-color: #01010126; padding: 20px; }
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
                  <p>Hello <strong>${user.first_name} ${user.last_name}</strong>,</p>
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

    await sendEmail(user.email, lang === "fa" ? "خوش‌آمدگویی به جابسرا" : "Welcome to JobSara", welcomeHtml);

    res.json({
      success: true,
      message: req.t("User registered successfully"),
      token,
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
    console.error("Register verify error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});

// فراموشی رمز عبور: ارسال کد ریست
router.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t("User not found"),
      });
    }

    const code = User.generateVerificationCode();
    await User.saveVerificationToken(user.id, code, 'password_reset');

    const lang = req.headers["accept-language"]?.startsWith("fa") ? "fa" : "en";

    const htmlContent = lang === "fa" ? `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>ریست رمز عبور جابسرا</title>
        <style>
          body { font-family: sans-serif; background:#01010126; padding:20px; }
          .container { max-width:600px; margin:auto; background:white; border-radius:8px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
          .header { background:#1E3A8A; color:white; padding:15px; text-align:center; border-radius:8px 8px 0 0; }
          .content { padding:20px; text-align:center; }
          .code { background:#38BDF8; color:white; padding:10px 20px; display:inline-block; border-radius:4px; letter-spacing:5px; font-size:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ریست رمز عبور</h1>
          </div>
          <div class="content">
            <p>سلام <strong>${user.first_name} ${user.last_name}</strong>،</p>
            <p>کد ریست رمز عبور شما:</p>
            <div class="code">${code}</div>
            <p>این کد تا ۱۰ دقیقه معتبر است.</p>
            <p>اگر شما درخواست ریست رمز عبور نداده‌اید، این ایمیل را نادیده بگیرید.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>JobSara Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; background:#01010126; padding:20px; }
          .container { max-width:600px; margin:auto; background:white; border-radius:8px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
          .header { background:#1E3A8A; color:white; padding:15px; text-align:center; border-radius:8px 8px 0 0; }
          .content { padding:20px; text-align:center; }
          .code { background:#38BDF8; color:white; padding:10px 20px; display:inline-block; border-radius:4px; letter-spacing:5px; font-size:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${user.first_name} ${user.last_name}</strong>,</p>
            <p>Your password reset code:</p>
            <div class="code">${code}</div>
            <p>This code is valid for 10 minutes.</p>
            <p>If you did not request a password reset, ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(email, lang === "fa" ? "ریست رمز عبور جابسرا" : "JobSara Password Reset", htmlContent);

    res.json({
      success: true,
      message: req.t("Password reset code sent"),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});

// ریست رمز عبور
router.post("/api/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: req.t("User not found") });
    }

    const validToken = await User.getValidVerificationToken(user.id, code, 'password_reset');
    if (!validToken) {
      return res.status(400).json({ success: false, message: req.t("Invalid or expired code") });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.update(user.id, { password: hashedPassword });
    await User.deleteVerificationToken(user.id, 'password_reset');

    res.json({ success: true, message: req.t("Password reset successful") });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});
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
// نکته: در روت /api/login حتماً چک کن که user.is_verified === 1 باشه، وگرنه خطا بده

module.exports = router;