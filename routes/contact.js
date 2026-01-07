const express = require("express");
const router = express.Router();
const ContactUs = require("../models/contact-us");
const { authenticateToken, requireAdmin } = require("../middlewares/auth");
const { decode, encode } = require("../utils/idHasher");

// contact-us
// add new message for contact us
router.post("/api/contact-us", authenticateToken, async (req, res) => {
  try {
    const { title, describe } = req.body;
    const user = req.user;

    // بررسی فیلدهای اجباری
    if (!title || !describe) {
      return res.status(400).json({
        success: false,
        message: req.t("Missing required fields"),
      });
    }

    const messageId = ContactUs.create({
      title,
      describe,
      userId: req.user.id,
    });
    console.log(user);
    console.log("Message created with ID:", messageId);
    const hashedMessageId = encode(messageId);
    res.status(201).json({
      success: true,
      message: "Message created!",
      hashedMessageId,
    });
  } catch (err) {
    console.log("err: ", err);
    res.status(500).json({
      success: false,
      message: "something went wrong!",
    });
  }
});

router.get(
  "/api/contact-us",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;

    try {
      // اینجا از let استفاده کن تا بتونی دوباره assign کنی
      let messages = await ContactUs.getAll(
        parseInt(limit),
        parseInt(offset)
      );

      // اضافه کردن hashedId و حذف id عددی
      messages = messages.map((m) => ({
        ...m,
        hashedId: encode(m.id),
      }));
      messages.forEach((m) => delete m.id);

      res.json({
        messages,                    // درست شد
        totalCount: messages.length  // فقط یک بار totalCount بذار
      });
    } catch (err) {
      console.log("err: ", err);
      res.status(500).json({
        success: false,
        message: "something went wrong!",
      });
    }
  }
);

router.delete(
  "/api/contact-us/:hashedId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const messageId = decode(req.params.hashedId);

      const message = await ContactUs.find(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: req.t("Message not found!"),
        });
      }

      const changes = await ContactUs.delete(messageId);

      if (changes > 0) {
        res.json({
          success: true,
          message: req.t("Message deleted successfully"),
        });
      } else {
        res.status(400).json({
          success: false,
          message: req.t("Failed to delete message"),
        });
      }
    } catch (err) {
      console.log("err: ", err);
      res.status(500).json({
        success: false,
        message: "something went wrong!",
      });
    }
  }
);

router.get(
  "/api/contact-us/:hashedId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const messageId = decode(req.params.hashedId);

      const message = await ContactUs.find(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: req.t("Message not found!"),
        });
      }

      message.hashedId = encode(message.id);
      delete message.id;
      res.json({ message: message });
    } catch (err) {
      console.log("err: ", err);
      res.status(500).json({
        success: false,
        message: "something went wrong!",
      });
    }
  }
);

module.exports = router;
