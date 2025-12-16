require("dotenv").config();
const http = require("http");
const path = require("path");
const fs = require("fs");

const routes = require("./routes/routes");
const connectDB = require("./models/db");

connectDB();

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {

    // 🔥 STEP 5: Serve uploaded images
    if (req.url.startsWith("/uploads/")) {
        const filePath = path.join(__dirname, req.url);

        // file exists?
        if (fs.existsSync(filePath)) {
            const stream = fs.createReadStream(filePath);
            return stream.pipe(res);
        } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Image not found" }));
        }
    }

    // 👉 All other routes
    routes.handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
