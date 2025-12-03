require("dotenv").config();
const http = require("http");
const routes = require("./routes/routes");
const connectDB = require("./models/db");

connectDB();

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
    routes.handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
