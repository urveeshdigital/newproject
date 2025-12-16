const http = require("http");
const path = require("path");
const fs = require("fs");

const routes = require("./routes/routes");
const connectDB = require("./models/db");

connectDB();

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {

    // 🔥 FIXED STATIC IMAGE SERVE
    if (req.url.startsWith("/uploads/")) {
        const safeUrl = decodeURIComponent(req.url); // 🔑 IMPORTANT
        const filePath = path.join(__dirname, safeUrl);

        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();

            // basic content-type
            const mimeTypes = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp"
            };

            res.writeHead(200, {
                "Content-Type": mimeTypes[ext] || "application/octet-stream"
            });

            return fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Image not found" }));
        }
    }

    // other routes
    routes.handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
