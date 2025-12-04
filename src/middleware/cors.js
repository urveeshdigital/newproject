exports.cors = (req, res) => {
    // Allowed origins (you can allow all with "*")
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Allowed headers
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Allowed methods
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    // If preflight request (browser checks), return early
    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return false; // stops request cycle
    }

    return true;
};
