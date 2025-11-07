const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // یا 'yahoo', 'outlook' و غیره
    auth: {
        user: 'jobsara01@gmail.com', // ایمیل خودت
        pass: 'wpgx rvys lpex xbmf' // اپ پسورد گوگل، نه پسورد اصلی
    }
});

// فانکشن برای ارسال ایمیل
async function sendEmail(to, subject, htmlContent) {
    const mailOptions = {
        from: 'jobsara01@gmail.com',
        to,
        subject,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent to:', to);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendEmail };