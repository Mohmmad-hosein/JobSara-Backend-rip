const jwt = require('jsonwebtoken');
const User = require('../models/user'); 

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: req.t("Access token required"), // استفاده از i18next
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: req.t("User not found"),
      });
    }

    req.user = user;

    const acceptLang =
      req.headers["accept-language"]?.split(",")[0]?.trim() || "en";
    const lang = acceptLang.startsWith("fa") ? "fa" : "en";
    if (!user.language) {
      await User.update(user.id, { language: lang });
      req.user.language = lang;
    }
    req.i18n.changeLanguage(user.language || "en");
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        success: false,
        message: req.t("Token expired"),
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        success: false,
        message: req.t("Invalid token"),
      });
    }

    res.status(500).json({
      success: false,
      message: req.t("Authentication failed"),
    });
  }
};

// Middleware برای بررسی نقش ادمین
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== "admin") {
    return res.status(403).json({
      success: false,
      message: req.t("Admin access required"),
    });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };