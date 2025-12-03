const jwt = require("jsonwebtoken");
const { sendJSON } = require("../utils/response");

module.exports = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return sendJSON(res,401,{ error: "No token provided" });

    const token = authHeader.replace("Bearer ", "");
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return sendJSON(res,401,{ error: "Invalid or expired token" });
    }
};
