const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  // Fallback for development/testing without real credentials
  transporter = null;
}

/**
 * Send password reset OTP email
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} customerName 
 */
async function sendOtpEmail(toEmail, otp, customerName = 'عميلنا العزيز') {
  const fromAddress = process.env.EMAIL_FROM || '"شركة القريني للزي الموحد" <no-reply@qreini.com>';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; background-color: #FAF9F7; margin: 0; padding: 20px; color: #2D241E; direction: rtl; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(92, 61, 46, 0.08); border: 1px solid #E8E2DA; }
        .header { background: linear-gradient(135deg, #422B20 0%, #5C3D2E 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header p { margin: 6px 0 0; font-size: 12px; color: #F4EBE1; opacity: 0.9; }
        .content { padding: 32px 28px; text-align: right; }
        .greeting { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
        .instruction { font-size: 14px; color: #6C584C; line-height: 1.6; margin-bottom: 24px; }
        .otp-container { background: #F8F5F1; border: 2px dashed #C59B6D; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #5C3D2E; font-family: monospace; }
        .otp-note { font-size: 12px; color: #8C786A; margin-top: 8px; }
        .warning { font-size: 12px; color: #A44A3F; background: #FDF2F0; padding: 12px; border-radius: 10px; margin-top: 20px; line-height: 1.5; }
        .footer { background: #F8F5F1; padding: 18px; text-align: center; font-size: 11px; color: #9E8C7F; border-top: 1px solid #EAE3DA; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>شركة القريني</h1>
          <p>للزي الموحد والأقمشة الفاخرة</p>
        </div>
        <div class="content">
          <div class="greeting">مرحباً ${customerName}،</div>
          <p class="instruction">
            لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجر القريني. يرجى استخدام رمز التحقق التالي لإتمام العملية:
          </p>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-note">هذا الرمز صالح لمدة 15 دقيقة فقط</div>
          </div>
          <div class="warning">
            ⚠️ إذا لم تكن أنت من طلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان وستبقى بياناتك محمية.
          </div>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} شركة القريني للزي الموحد والأقمشة - جميع الحقوق محفوظة
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log to console for instant developer feedback
  console.log('====================================================');
  console.log(`🔑 [NODEMAILER OTP] Code for ${toEmail}: ${otp}`);
  console.log('====================================================');

  if (!transporter) {
    console.log('ℹ️ [Nodemailer] SMTP not configured in .env; OTP logged to console above.');
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `رمز التحقق لاستعادة كلمة المرور: ${otp} - شركة القريني`,
      html: htmlContent,
    });
    console.log('✅ [Nodemailer] Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [Nodemailer] Error sending email:', error.message);
    // Still resolve so dev flow doesn't break if SMTP has an invalid key
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
};
