const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { Sample, Product, Notification } = require('../models');
const { Op } = require('sequelize');
require('dotenv').config();

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your_email@gmail.com',
    pass: process.env.SMTP_PASS || 'your_password'
  }
});

// Run every day at 12:00 PM
cron.schedule('0 12 * * *', async () => {
  console.log('Running daily cron job for samples...');
  try {
    const overdueSamples = await Sample.findAll({
      where: {
        status: 'active',
        notificationSent: false,
        dueDate: {
          [Op.lt]: new Date()
        }
      },
      include: [Product]
    });

    for (const sample of overdueSamples) {
      const productName = sample.Product ? sample.Product.name : 'منتج غير معروف';
      
      // 1. Create System Notification
      await Notification.create({
        type: 'alert',
        title: 'عينة متأخرة',
        desc: `تأخر العميل ${sample.customerName} في إرجاع عينة المنتج: ${productName}`
      });

      // 2. Send Email
      const mailOptions = {
        from: process.env.SMTP_USER || 'admin@qreini.com',
        to: process.env.ADMIN_EMAIL || 'admin@qreini.com', // fallback
        subject: 'تنبيه: تأخر إرجاع عينة منتج',
        text: `تأخر العميل ${sample.customerName} في إرجاع عينة المنتج: ${productName}. تاريخ الاستلام: ${sample.takenAt}. يرجى المتابعة.`
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent for sample ${sample.id}`);
      } catch (emailError) {
        console.error(`Failed to send email for sample ${sample.id}:`, emailError);
        // We will still mark as notification sent so it doesn't spam system notifications either,
        // or you could choose to keep it false if email fails. We'll mark true for now.
      }

      // Mark as sent
      sample.notificationSent = true;
      await sample.save();
    }
  } catch (error) {
    console.error('Error in sample cron job:', error);
  }
});
