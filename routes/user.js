const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// API برای گرفتن پروفایل کاربر
router.get("/api/profile/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.id !== parseInt(userId) && req.user.user_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: req.t("Access denied"),
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t("User not found"),
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: req.t("Profile retrieved successfully"),
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: req.t("Internal server error"),
    });
  }
});

// API برای ویرایش پروفایل کاربر
router.put("/api/profile/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    if (req.user.id !== parseInt(userId) && req.user.user_type !== "admin") {
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

// API برای گرفتن همه کاربران (فقط برای ادمین)
router.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const users = await User.getAll(parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      message: req.t("Users retrieved successfully"),
      users: users,
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

// API برای گرفتن کاربر خاص توسط ID (فقط برای ادمین)
router.get("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t("User not found"),
      });
    }

    const { password, ...userWithoutPassword } = user;

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
});

// API برای ارتقای نقش کاربر (فقط برای ادمین)
router.put("/api/users/:id/role",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
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

// API برای حذف کاربر (فقط برای ادمین)
router.delete("/api/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;

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