const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type:String, required:true, unique:true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user","admin"], default: "user" },
    emailVerified: { type: Boolean, default: false },
    emailVerificationOTP: { type: String },
    emailVerificationOTPExpiry: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpiry: { type: Date },
    refreshTokens: [{ token: String, createdAt: Date, expiresAt: Date }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
