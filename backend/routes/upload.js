const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../config/multer');

const router = express.Router();

// 上传图片
router.post('/', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const imageUrl = `/api/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

module.exports = router;
