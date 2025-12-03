const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendJSON } = require("../utils/response");
const { sendMail } = require("../services/emailService");

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

exports.register = async (req, res, body) => {
    try {
        const { name, email, password, role } = body;
        if (!name || !email || !password) return sendJSON(res,400,{ error: "All fields (name,email,password) are required" });

        const exists = await User.findOne({ email });
        if (exists) return sendJSON(res,400,{ error: "Email already exists" });

        const hashed = bcrypt.hashSync(password, 10);
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

        const user = await User.create({
            name, email, password: hashed, role: role || "user",
            emailVerificationOTP: otp, emailVerificationOTPExpiry: otpExpiry
        });

        // send OTP via email
        try {
            await sendMail(email, "Verify your email", `Your verification code is ${otp}`, `<p>Your verification code is <strong>${otp}</strong></p>`);
        } catch (err) {
            console.error("Email send failed:", err);
        }

        return sendJSON(res,201,{ message: "User registered. Verification OTP sent to email." , user: { id: user.id, email: user.email }});
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.verifyEmail = async (req, res, body) => {
    try {
        const { email, otp } = body;
        if (!email || !otp) return sendJSON(res,400,{ error: "Email and OTP required" });

        const user = await User.findOne({ email });
        if (!user) return sendJSON(res,400,{ error: "User not found" });
        if (user.emailVerified) return sendJSON(res,400,{ error: "Email already verified" });

        if (user.emailVerificationOTP !== otp) return sendJSON(res,400,{ error: "Invalid OTP" });
        if (new Date() > user.emailVerificationOTPExpiry) return sendJSON(res,400,{ error: "OTP expired" });

        user.emailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpiry = undefined;
        await user.save();

        return sendJSON(res,200,{ message: "Email verified successfully" });
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.login = async (req, res, body) => {
    try {
        const { email, password } = body;
        if (!email || !password) return sendJSON(res,400,{ error: "Email and password required" });

        const user = await User.findOne({ email });
        if (!user) return sendJSON(res,400,{ error: "Invalid email or password" });
        if (!user.emailVerified) return sendJSON(res,403,{ error: "Email not verified" });

        const match = bcrypt.compareSync(password, user.password);
        if (!match) return sendJSON(res,400,{ error: "Invalid email or password" });

        const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m" });
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" });

        const now = new Date();
        const expiresAt = new Date(now.getTime() + (parseInt(process.env.REFRESH_TOKEN_TTL_MS || (7*24*60*60*1000))));
        user.refreshTokens.push({ token: refreshToken, createdAt: now, expiresAt });
        await user.save();

        return sendJSON(res,200,{ message: "Login successful", accessToken, refreshToken });
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.token = async (req, res, body) => {
    try {
        const { refreshToken } = body;
        if (!refreshToken) return sendJSON(res,400,{ error: "refreshToken required" });

        // verify and check in DB
        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) return sendJSON(res,401,{ error: "Invalid refresh token" });

            const exists = user.refreshTokens.find(rt => rt.token === refreshToken);
            if (!exists) return sendJSON(res,401,{ error: "Refresh token not recognized (logged out?)" });

            // generate new access token
            const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m" });
            return sendJSON(res,200,{ accessToken });
        } catch (e) {
            return sendJSON(res,401,{ error: "Invalid or expired refresh token" });
        }
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.logout = async (req, res, body) => {
    try {
        const { refreshToken } = body;
        if (!refreshToken) return sendJSON(res,400,{ error: "refreshToken required" });

        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) return sendJSON(res,200,{ message: "Logged out" });

            user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
            await user.save();
            return sendJSON(res,200,{ message: "Logout successful" });
        } catch (e) {
            return sendJSON(res,200,{ message: "Logout successful" });
        }
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.profile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password -refreshTokens -emailVerificationOTP -emailVerificationOTPExpiry -resetPasswordOTP -resetPasswordOTPExpiry");
        if (!user) return sendJSON(res,404,{ error: "User not found" });
        return sendJSON(res,200,{ user });
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

// forgot password (OTP) and reset
exports.forgotPassword = async (req, res, body) => {
    try {
        const { email } = body;
        if (!email) return sendJSON(res,400,{ error: "Email required" });
        const user = await User.findOne({ email });
        if (!user) return sendJSON(res,404,{ error: "User not found" });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 min
        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = otpExpiry;
        await user.save();

        try {
            await sendMail(email, "Password reset OTP", `Your password reset OTP is ${otp}`, `<p>Your password reset OTP is <strong>${otp}</strong></p>`);
        } catch (err) {
            console.error("Failed to send email:", err);
        }

        return sendJSON(res,200,{ message: "OTP sent to email" });
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};

exports.resetPassword = async (req, res, body) => {
    try {
        const { email, otp, newPassword } = body;
        if (!email || !otp || !newPassword) return sendJSON(res,400,{ error: "email, otp and newPassword required" });

        const user = await User.findOne({ email });
        if (!user) return sendJSON(res,404,{ error: "User not found" });

        if (user.resetPasswordOTP !== otp) return sendJSON(res,400,{ error: "Invalid OTP" });
        if (new Date() > user.resetPasswordOTPExpiry) return sendJSON(res,400,{ error: "OTP expired" });

        user.password = bcrypt.hashSync(newPassword, 10);
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpiry = undefined;
        await user.save();

        return sendJSON(res,200,{ message: "Password reset successful" });
    } catch (err) {
        console.error(err);
        return sendJSON(res,500,{ error: "Server error" });
    }
};
