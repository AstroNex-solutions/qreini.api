const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'لا يوجد رمز تفويض، يرجى تسجيل الدخول أولاً' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qreini_super_secret_key_2026');
    if (!decoded.customer) {
      return res.status(401).json({ error: 'رمز الدخول غير صالح لحساب العملاء' });
    }
    req.customer = decoded.customer;
    next();
  } catch (err) {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
  }
};
