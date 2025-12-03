const auth = require("../controllers/auth.controller");
const { parseBody } = require("../utils/bodyParser");
const protect = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

exports.handleRequest = async (req, res) => {
    const url = req.url.split("?")[0];
    const method = req.method;

    // Apply rate limit globally
    // Skip rate limit for health check
    if (!(url === "/health" && method === "GET")) {
        await new Promise((resolve) => rateLimit(req, res, resolve));
    }

    if (url === "/health" && method === "GET") {
        return res.writeHead(200, {"Content-Type":"application/json"}) && res.end(JSON.stringify({ status: "ok" }));
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

    res.writeHead(404, {"Content-Type":"application/json"});
    res.end(JSON.stringify({error:"Route Not Found"}));
};
