const auth = require("../controllers/auth.controller");
const { parseBody } = require("../utils/bodyParser");
const protect = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { cors } = require("../middleware/cors");

exports.handleRequest = async (req, res) => {

    // ----------------------------
    // 1) ALWAYS APPLY CORS FIRST
    // ----------------------------
    const allowed = cors(req, res);
    if (!allowed) return;  // handles OPTIONS request and stops flow

    const url = req.url.split("?")[0];
    const method = req.method;

    // ----------------------------
    // 2) Rate Limiting (after CORS)
    // ----------------------------
    if (!(url === "/health" && method === "GET")) {
        await new Promise((resolve) => rateLimit(req, res, resolve));
    }

    // ----------------------------
    // 3) Routes
    // ----------------------------

    if (url === "/health" && method === "GET") {
        return res.writeHead(200, {"Content-Type":"application/json"}) 
            && res.end(JSON.stringify({ status: "ok" }));
    }

    if (url === "/register" && method === "POST") {
        const body = await parseBody(req);
        return auth.register(req, res, body);
    }

    if (url === "/verify-email" && method === "POST") {
        const body = await parseBody(req);
        return auth.verifyEmail(req, res, body);
    }

    if (url === "/login" && method === "POST") {
        const body = await parseBody(req);
        return auth.login(req, res, body);
    }

    if (url === "/token" && method === "POST") {
        const body = await parseBody(req);
        return auth.token(req, res, body);
    }

    if (url === "/logout" && method === "POST") {
        const body = await parseBody(req);
        return auth.logout(req, res, body);
    }

    if (url === "/profile" && method === "GET") {
        return protect(req, res, () => auth.profile(req, res));
    }

    if (url === "/forgot-password" && method === "POST") {
        const body = await parseBody(req);
        return auth.forgotPassword(req, res, body);
    }

    if (url === "/reset-password" && method === "POST") {
        const body = await parseBody(req);
        return auth.resetPassword(req, res, body);
    }

    // ----------------------------
    // 4) Route Not Found
    // ----------------------------
    res.writeHead(404, {"Content-Type":"application/json"});
    res.end(JSON.stringify({ error: "Route Not Found" }));
};
