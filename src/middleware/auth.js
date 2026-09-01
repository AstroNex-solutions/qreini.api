const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ error: 'غير مصرح لك بالوصول، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'تنسيق التوكن غير صحيح' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qreini_super_secret_key_2026');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
};
