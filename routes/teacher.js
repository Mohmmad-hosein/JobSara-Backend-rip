const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG/PNG allowed"), false);
    }
  },
});

// API برای گرفتن لیست تیچرها
router.get("/api/teachers", authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.user_type === "admin";
    const { search, minRating = 0, limit = 10, offset = 0 } = req.query;

    const teachers = await Teacher.getTeachers({
      isAdmin,
      search,
      minRating: parseFloat(minRating),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: req.t("Teachers retrieved successfully"),
      teachers,
      pagination: { limit, offset, total: teachers.length },
    });
  } catch (error) {
    console.error("Teachers list error:", error);
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

// API اضافه کردن تیچر
router.post("/api/teachers",
  authenticateToken,
  requireAdmin,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const profilePictureBuffer = req.file ? req.file.buffer : null;
      const teacherId = await Teacher.addTeacher(
        req.body,
        profilePictureBuffer
      );
      res
        .status(201)
        .json({ success: true, message: req.t("Teacher added"), teacherId });
    } catch (error) {
      console.error("Error adding teacher:", error);
      res.status(500).json({
        success: false,
        message:
          req.t("Error adding teacher") +
          (error.message ? ": " + error.message : ""),
      });
    }
  }
);

// API حذف تیچر
router.delete("/api/teachers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const changes = await Teacher.deleteTeacher(req.params.id);
      if (changes > 0) {
        res.json({ success: true, message: req.t("Teacher deleted") });
      } else {
        res
          .status(404)
          .json({ success: false, message: req.t("Teacher not found") });
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: req.t("Error deleting teacher") });
    }
  }
);

// API تیچرها برای لندینگ
router.get("/api/landing/teachers", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const lang = req.i18n.language; // زبان از i18next
    const teachers = await Teacher.getLandingTeachers(parseInt(limit), lang); // lang اضافه
    res.json({ success: true, teachers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

// API جزئیات تیچر
router.get("/api/teachers/:id", authenticateToken, async (req, res) => {
  try {
    const teacher = await Teacher.getTeacherDetails(req.params.id);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: req.t("Teacher not found") });
    }
    res.json({
      success: true,
      message: req.t("Teacher retrieved successfully"),
      teacher,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});



module.exports = router;