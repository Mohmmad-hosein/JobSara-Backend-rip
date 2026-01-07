const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { authenticateToken, requireAdmin } = require("../middlewares/auth");
const { decode, encode } = require("../utils/idHasher");

// پروفایل
router.get("/api/profile/:hashedId", authenticateToken, async (req, res) => {
  try {
    const userId = decode(req.params.hashedId);
    if (!userId)
      return res.status(400).json({ success: false, message: "Invalid ID" });

    // چک دسترسی (خود کاربر یا ادمین)
    if (req.user.id !== userId && req.user.user_type !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: req.t("Access denied") });
    }

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: req.t("User not found") });

    const { password, id: _, ...userWithoutPassword } = user;
    userWithoutPassword.hashedId = encode(user.id);
    delete userWithoutPassword.id;

    res.json({
      success: true,
      message: req.t("Profile retrieved successfully"),
      user: userWithoutPassword,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

// ویرایش پروفایل
router.put("/api/profile/:hashedId", authenticateToken, async (req, res) => {
  try {
    const userId = decode(req.params.hashedId);
    const updatedUser = await User.findById(userId);

    if (
      req.user.hashedId !== parseInt(userId) &&
      req.user.user_type !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: req.t("Access denied"),
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: req.t("User not found") });
    }

    const changes = await User.update(userId, updateData);

    if (changes > 0) {
      const updatedUser = await User.findById(userId);
      const { password, ...userWithoutPassword } = updatedUser;
      userWithoutPassword.hashedId = encode(updatedUser.id);
      delete userWithoutPassword.id;

      res.json({
        success: true,
        message: req.t("Profile updated successfully"),
        user: userWithoutPassword,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: req.t("Failed to update profile") });
    }
  } catch (error) {
    console.error("Profile update error:", error);
    res
      .status(500)
      .json({ success: false, message: req.t("Internal server error") });
  }
});

// ادمین - لیست کاربران
router.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    let users = await User.getAll(parseInt(limit), parseInt(offset)); // اینجا let بذار

    // اضافه کردن hashedId و حذف id عددی
    users = users.map(u => ({
      ...u,
      hashedId: encode(u.id),
    }));
    users.forEach(u => delete u.id); // id عددی رو کامل حذف کن (امنیت بیشتر)

    res.json({
      success: true,
      message: req.t("Users retrieved successfully"),
      users,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: users.length,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});

// ادمین - کاربر خاص
router.get(
  "/api/users/:hashedId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = decode(req.params.hashedId);

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: req.t("User not found"),
        });
      }

      const { password, ...userWithoutPassword } = user;
      userWithoutPassword.hashedId = encode(user.id);
      delete userWithoutPassword.id;

      res.json({
        success: true,
        message: req.t("User retrieved successfully"),
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        message: req.t("Internal server error"),
      });
    }
  }
);

// تغییر نقش
router.put(
  "/api/users/:hashedId/role",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = decode(req.params.hashedId);
      const { newRole } = req.body;

      if (!newRole) {
        return res.status(400).json({
          success: false,
          message: req.t("newRole is required in request body"),
        });
      }

      const validRoles = [
        "job_seeker",
        "intern",
        "employer",
        "admin",
        "teacher",
      ];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({
          success: false,
          message: req.t(
            `Invalid role. Valid roles are: ${validRoles.join(", ")}`
          ),
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: req.t("User not found") });
      }

      const changes = await User.update(userId, { user_type: newRole });

      if (changes > 0) {
        const updatedUser = await User.findById(userId);
        res.json({
          success: true,
          message: req.t("User role updated successfully"),
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            userType: updatedUser.user_type,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: req.t("Failed to update user role"),
        });
      }
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({
        success: false,
        message: req.t("Internal server error") + ": " + error.message,
      });
    }
  }
);

// حذف کاربر
router.delete(
  "/api/users/:hashedId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = decode(req.params.hashedId);

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: req.t("User not found"),
        });
      }

      if (req.user.id === parseInt(userId)) {
        return res.status(400).json({
          success: false,
          message: req.t("Cannot delete your own account"),
        });
      }

      const changes = await User.delete(userId);

      if (changes > 0) {
        res.json({
          success: true,
          message: req.t("User deleted successfully"),
        });
      } else {
        res.status(400).json({
          success: false,
          message: req.t("Failed to delete user"),
        });
      }
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: req.t("Internal server error"),
      });
    }
  }
);

module.exports = router;
