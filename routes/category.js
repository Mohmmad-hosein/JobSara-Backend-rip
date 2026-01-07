const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { decode, encode } = require('../utils/idHasher');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // حداکثر ۲ مگ
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("فقط JPG/PNG/GIF مجاز است"));
  },
});

// لیست همه کتگوری‌ها (عمومی - برای لندینگ و فیلتر)
router.get("/api/categories", async (req, res) => {
  try {
    let categories = await Category.getAll();

    // hashedId اضافه کن
    categories = categories.map(c => ({
      ...c,
      hashedId: encode(c.id),
    }));
    categories.forEach(c => delete c.id);

    res.json({
      success: true,
      message: req.t("Categories retrieved successfully"),
      categories,
    });
  } catch (error) {
    console.error("Categories list error:", error);
    res.status(500).json({ success: false, message: req.t("Internal server error") });
  }
});

// جزئیات یک کتگوری
router.get("/api/categories/:hashedId", async (req, res) => {
  try {
    const id = decode(req.params.hashedId);
    if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });

    let category = await Category.getById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: req.t("Category not found") });
    }

    category.hashedId = encode(category.id);
    delete category.id;

    res.json({
      success: true,
      message: req.t("Category retrieved successfully"),
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: req.t("Internal server error") });
  }
});

// اضافه کردن کتگوری (فقط ادمین)
router.post("/api/categories",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: req.t("Title is required") });
      }

      const imageBuffer = req.file ? req.file.buffer : null;
      const categoryId = await Category.create({ title, description, imageBuffer });
      const hashedId = encode(categoryId);

      res.status(201).json({
        success: true,
        message: req.t("Category added successfully"),
        hashedId,
      });
    } catch (error) {
      console.error("Add category error:", error);
      res.status(500).json({ success: false, message: req.t("Internal server error") });
    }
  }
);

// حذف کتگوری (فقط ادمین)
router.delete("/api/categories/:hashedId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = decode(req.params.hashedId);
      if (!id) return res.status(400).json({ success: false, message: "Invalid ID" });

      const changes = await Category.delete(id);
      if (changes > 0) {
        res.json({ success: true, message: req.t("Category deleted successfully") });
      } else {
        res.status(404).json({ success: false, message: req.t("Category not found") });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: req.t("Internal server error") });
    }
  }
);

module.exports = router;