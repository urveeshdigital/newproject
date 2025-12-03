const { sendJSON } = require("../utils/response");

// Simple in-memory rate limiter. For production use Redis.
const WINDOW_MS = (parseInt(process.env.RATE_WINDOW_MS) || 60) * 1000; // default 60s
const MAX_REQUESTS = parseInt(process.env.RATE_MAX_REQUESTS) || 100;

const hits = new Map();

module.exports = (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
        const now = Date.now();
        const entry = hits.get(ip) || { count: 0, start: now };
        if (now - entry.start > WINDOW_MS) {
            entry.count = 1;
            entry.start = now;
            hits.set(ip, entry);
            return next();
        } else {
            entry.count += 1;
            hits.set(ip, entry);
            if (entry.count > MAX_REQUESTS) {
                return sendJSON(res,429,{ error: "Too many requests. Please try later." });
            } else return next();
        }
    } catch (e) {
        return next();
    }
};
