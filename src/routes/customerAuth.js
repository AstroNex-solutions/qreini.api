const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Customer, Order } = require('../models');
const customerAuthMiddleware = require('../middleware/customerAuth');
const { sendOtpEmail } = require('../services/emailService');

// 1. Customer Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال جميع الحقول الأساسية: الاسم، البريد الإلكتروني، وكلمة المرور' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'يجب أن تكون كلمة المرور مكونة من 6 خانات على الأقل' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if customer already exists
    const existing = await Customer.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await Customer.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      lastVisit: new Date(),
    });

    const payload = {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'qreini_super_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح مرحباً بك في القريني!',
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      }
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً' });
  }
});

// 2. Customer Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ where: { email: normalizedEmail } });

    if (!customer) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    if (!customer.password) {
      return res.status(400).json({ 
        error: 'تم إنشاء حسابك عبر طلب شراء سابق بدون كلمة مرور، يرجى الضغط على "نسيت كلمة المرور" لإنشاء كلمة مرور لحسابك' 
      });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // Update last visit
    customer.lastVisit = new Date();
    await customer.save();

    const payload = {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'qreini_super_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح!',
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الدخول' });
  }
});

// 3. Forgot Password - Generate & Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني الخاص بحسابك' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const customer = await Customer.findOne({ where: { email: normalizedEmail } });

    if (!customer) {
      return res.status(404).json({ error: 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    customer.resetPasswordOtp = otp;
    customer.resetPasswordExpires = expires;
    await customer.save();

    // Send email with Nodemailer
    await sendOtpEmail(customer.email, otp, customer.name);

    res.json({
      message: 'تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني بنجاح، الرمز صالح لمدة 15 دقيقة',
      email: customer.email,
    });
  } catch (error) {
    console.error('Customer forgot password error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال رمز التحقق، يرجى المحاولة لاحقاً' });
  }
});

// 4. Reset Password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني، رمز التحقق، وكلمة المرور الجديدة' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'يجب أن تكون كلمة المرور الجديدة 6 خانات على الأقل' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const customer = await Customer.findOne({ where: { email: normalizedEmail } });

    if (!customer) {
      return res.status(404).json({ error: 'لم يتم العثور على الحساب' });
    }

    if (!customer.resetPasswordOtp || customer.resetPasswordOtp !== cleanOtp) {
      return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
    }

    if (!customer.resetPasswordExpires || new Date() > new Date(customer.resetPasswordExpires)) {
      return res.status(400).json({ error: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد' });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);
    customer.resetPasswordOtp = null;
    customer.resetPasswordExpires = null;
    await customer.save();

    res.json({
      message: 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة',
    });
  } catch (error) {
    console.error('Customer reset password error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' });
  }
});

// 5. Change Password (Authenticated route)
router.post('/change-password', customerAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'يرجى إدخال كلمة المرور الحالية والجديدة' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'يجب أن تكون كلمة المرور الجديدة 6 خانات على الأقل' });
    }

    const customer = await Customer.findByPk(req.customer.id);

    if (!customer) {
      return res.status(404).json({ error: 'الحساب غير موجود' });
    }

    if (customer.password) {
      const isMatch = await bcrypt.compare(currentPassword, customer.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);
    await customer.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح!' });
  } catch (error) {
    console.error('Customer change password error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
});

// 6. Get Logged-in Customer Profile & Orders
router.get('/me', customerAuthMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.customer.id, {
      attributes: { exclude: ['password', 'resetPasswordOtp', 'resetPasswordExpires'] },
      include: [
        {
          model: Order,
          limit: 10,
          order: [['createdAt', 'DESC']],
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({ error: 'الحساب غير موجود' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Customer profile fetch error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الملف الشخصي' });
  }
});

module.exports = router;
