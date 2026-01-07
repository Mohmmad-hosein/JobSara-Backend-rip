const express = require("express");
const dotenv = require("dotenv");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const { i18next, middleware } = require("./i18n");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const teacherRouter = require("./routes/teacher");
const contactRouter = require("./routes/contact");
const categoryRouter = require("./routes/category");
const cors = require("cors");


// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(middleware.handle(i18next)); // اضافه کردن middleware برای چندزبانه
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/", categoryRouter);
app.use("/", authRouter);
app.use("/", userRouter);
app.use("/", teacherRouter);
app.use("/", contactRouter);

// API برای گرفتن آمار کلی سایت
app.get("/api/summary", async (req, res) => {
  try {
    const userStats = await User.getUserStats();

    res.json({
      success: true,
      message: req.t("Site summary retrieved successfully"),
      summary: {
        totalUsers: userStats.total,
        jobSeekers: userStats.job_seeker,
        interns: userStats.intern,
        employers: userStats.employer,
        admins: userStats.admin,
        teachers: userStats.teacher,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Summary error:", error);
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: req.t("Server is running") });
});

// Route اصلی
app.get("/", (req, res) => {
  res.json({
    message: req.t("JobSara Backend Server"),
    version: "1.0.0",
    endpoints: {
      health: "/health",
      register: "/api/register/step1 (POST)",
      registerStep2: "/api/register/verify (POST)",
      login: "/api/login (POST)",
      logout: "/api/logout (POST)",
      forgotPassword: "/api/forgot-password (POST)",
      resetPassword: "/api/reset-password (POST)",
      setLanguage: "/api/set-language (POST)",
      getProfile: "/api/profile/:id (GET)",
      updateProfile: "/api/profile/:id (PUT)",
      getAllUsers: "/api/users (GET) - Admin only",
      getUser: "/api/users/:id (GET) - Admin only",
      updateRole: "/api/users/:id/role (PUT) - Admin only",
      deleteUser: "/api/users/:id (DELETE) - Admin only",
      getTeachers: "/api/teachers (GET)",
      addTeacher: "/api/teachers (POST) - Admin only",
      deleteTeacher: "/api/teachers/:id (DELETE) - Admin only",
      landingTeachers: "/api/landing/teachers (GET)",
      teacherDetails: "/api/teachers/:id (GET)",
      siteSummary: "/api/summary (GET)",
      getCategories: "/api/categories (GET)",
      getCategory: "/api/categories/:hashedId (GET)",
      addCategory: "/api/categories (POST) - Admin only + image upload",
      deleteCategory: "/api/categories/:hashedId (DELETE) - Admin only",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res
    .status(404)
    .json({ success: false, message: req.t("Endpoint not found") });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: req.t("Something went wrong!") });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Register: http://localhost:${PORT}/api/register`);
  console.log(`📍 Login: http://localhost:${PORT}/api/login`);
  console.log(`📍 API Summary: http://localhost:${PORT}/api/summary`);
});

module.exports = app;
