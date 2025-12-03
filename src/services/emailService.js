const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendMail = async (to, subject, text, html) => {
    const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        text,
        html
    });
    return info;
};
