const auth = require("../controllers/auth.controller");
const productCtrl = require("../controllers/product.controller");
const { parseBody } = require("../utils/bodyParser");
const protect = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { cors } = require("../middleware/cors");
const authorize = require("../middleware/authorize");

exports.handleRequest = async (req, res) => {
  // CORS first
  const allowed = cors(req, res);
  if (!allowed) return;

  const urlFull = req.url || "";
  const url = urlFull.split("?")[0];
  const method = req.method;

  // Rate limiting
  if (!(url === "/health" && method === "GET")) {
    await new Promise((resolve) => rateLimit(req, res, resolve));
  }

  // HEALTH
  if (url === "/health" && method === "GET") {
    return res.writeHead(200, {"Content-Type":"application/json"}) && res.end(JSON.stringify({ status: "ok" }));
  }

  // --- AUTH endpoints (existing) ---
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

  // --- PRODUCT endpoints ---
  // Create product (ADMIN)
if (url === "/products" && method === "POST") {
  return protect(req, res, () => {
    const authz = authorize(["admin"]);
    authz(req, res, () => {
      return productCtrl.createProduct(req, res);
    });
  });
}

  // List products (public) - supports query string e.g. ?page=1&limit=10&q=phone
  if (url === "/products" && method === "GET") {
    const qs = {};
    // parse querystring manually
    const parts = urlFull.split("?");
    if (parts[1]) {
      parts[1].split("&").forEach(pair => {
        const [k,v] = pair.split("=");
        if (k) qs[k] = decodeURIComponent(v || "");
      });
    }
    return productCtrl.listProducts(req, res, qs);
  }

  // Get single product
  // URL pattern: /products/:id
  if (url.startsWith("/products/") && method === "GET") {
    const id = url.split("/")[2];
    return productCtrl.getProduct(req, res, id);
  }

  // Update product (ADMIN)
  if (url.startsWith("/products/") && method === "PUT") {
    return protect(req, res, async () => {
      const authz = authorize(["admin"]);
      authz(req, res, async () => {
        const id = url.split("/")[2];
        const body = await parseBody(req);
        return productCtrl.updateProduct(req, res, id, body);
      });
    });
  }

  // Delete product (ADMIN)
  if (url.startsWith("/products/") && method === "DELETE") {
    return protect(req, res, async () => {
      const authz = authorize(["admin"]);
      authz(req, res, async () => {
        const id = url.split("/")[2];
        return productCtrl.deleteProduct(req, res, id);
      });
    });
  }

  // Not found
  res.writeHead(404, {"Content-Type":"application/json"});
  res.end(JSON.stringify({ error: "Route Not Found" }));
};
// UPLOAD PRODUCT IMAGE (ADMIN)
