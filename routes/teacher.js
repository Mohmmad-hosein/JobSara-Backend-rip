const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { decode, encode } = require('../utils/idHasher');

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

// لیست تیچرها
router.get("/api/teachers", authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.user_type === "admin";
    const { search, minRating = 0, limit = 10, offset = 0 } = req.query;

    let teachers = await Teacher.getTeachers({
      isAdmin,
      search,
      minRating: parseFloat(minRating),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // اضافه کردن hashedId و حذف id عددی
    teachers = teachers.map(t => ({
      ...t,
      hashedId: encode(t.id),
    }));
    teachers.forEach(t => delete t.id);

    res.json({
      success: true,
      message: req.t("Teachers retrieved successfully"),
      teachers,
      pagination: { limit, offset, total: teachers.length },
    });
  } catch (error) {
    console.error("Teachers list error:", error);
    res.status(500).json({ success: false, message: req.t("Internal server error") });
  }
});

// اضافه کردن تیچر
router.post("/api/teachers",
  authenticateToken,
  requireAdmin,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const profilePictureBuffer = req.file ? req.file.buffer : null;
      const teacherId = await Teacher.addTeacher(req.body, profilePictureBuffer);
      const hashedTeacherId = encode(teacherId); // hashed برمی‌گردونیم

      res.status(201).json({ 
        success: true, 
        message: req.t("Teacher added"), 
        hashedTeacherId // به جای teacherId عددی
      });
    } catch (error) {
      console.error("Error adding teacher:", error);
      res.status(500).json({
        success: false,
        message: req.t("Error adding teacher") + (error.message ? ": " + error.message : ""),
      });
    }
  }
);

// حذف تیچر
router.delete("/api/teachers/:hashedId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const teacherId = decode(req.params.hashedId);
    if (!teacherId) return res.status(400).json({ success: false, message: "Invalid ID" });

    const changes = await Teacher.deleteTeacher(teacherId);
    if (changes > 0) {
      res.json({ success: true, message: req.t("Teacher deleted") });
    } else {
      res.status(404).json({ success: false, message: req.t("Teacher not found") });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: req.t("Error deleting teacher") });
  }
});

// لندینگ تیچرها (عمومی، بدون توکن)
router.get("/api/landing/teachers", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const lang = req.i18n.language;
    let teachers = await Teacher.getLandingTeachers(parseInt(limit), lang);

    // hashedId اضافه کن
    teachers = teachers.map(t => ({
      ...t,
      hashedId: encode(t.id),
    }));
    teachers.forEach(t => delete t.id);

    res.json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: req.t("Internal server error") });
  }
});

// جزئیات تیچر
router.get("/api/teachers/:hashedId", authenticateToken, async (req, res) => {
  try {
    const teacherId = decode(req.params.hashedId);
    if (!teacherId) return res.status(400).json({ success: false, message: "Invalid ID" });

    let teacher = await Teacher.getTeacherDetails(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: req.t("Teacher not found") });
    }

    teacher.hashedId = encode(teacher.id);
    delete teacher.id;

    res.json({
      success: true,
      message: req.t("Teacher retrieved successfully"),
      teacher,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: req.t("Internal server error") });
  }
});

module.exports = router;