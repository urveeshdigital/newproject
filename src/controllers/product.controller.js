const Product = require("../models/product.model");
const { sendJSON } = require("../utils/response");

// Create product (admin)
exports.createProduct = async (req, res, body) => {
  try {
    const { name, description, price, inStock, tags } = body;
    if (!name || price === undefined) return sendJSON(res, 400, { error: "name and price required" });

    const product = await Product.create({
      name,
      description: description || "",
      price: Number(price),
      inStock: inStock === undefined ? true : !!inStock,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map(t=>t.trim()) : []),
      createdBy: req.user ? req.user.id : undefined
    });

    return sendJSON(res, 201, { message: "Product created", product });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: "Server error" });
  }
};

// Read list (public) with simple pagination & filters
exports.listProducts = async (req, res, query) => {
  try {
    // query may contain page, limit, q (search), minPrice, maxPrice, inStock
    const url = req.url || ""; // not strictly needed
    const q = (query.q || "").toString();
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (query.inStock !== undefined) filter.inStock = query.inStock === "true";
    if (query.minPrice) filter.price = Object.assign(filter.price || {}, { $gte: Number(query.minPrice) });
    if (query.maxPrice) filter.price = Object.assign(filter.price || {}, { $lte: Number(query.maxPrice) });

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return sendJSON(res, 200, { total, page, limit, products });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: "Server error" });
  }
};

// Read single product by id (public)
exports.getProduct = async (req, res, id) => {
  try {
    const product = await Product.findById(id);
    if (!product) return sendJSON(res, 404, { error: "Product not found" });
    return sendJSON(res, 200, { product });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: "Server error" });
  }
};

// Update product (admin)
exports.updateProduct = async (req, res, id, body) => {
  try {
    const product = await Product.findById(id);
    if (!product) return sendJSON(res, 404, { error: "Product not found" });

    // update allowed fields
    const fields = ["name", "description", "price", "inStock", "tags"];
    fields.forEach(f => {
      if (body[f] !== undefined) {
        product[f] = (f === "price") ? Number(body[f]) :
                     (f === "tags") ? (Array.isArray(body[f]) ? body[f] : body[f].split(",").map(t=>t.trim())) :
                     body[f];
      }
    });

    await product.save();
    return sendJSON(res, 200, { message: "Product updated", product });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: "Server error" });
  }
};

// Delete product (admin)
exports.deleteProduct = async (req, res, id) => {
  try {
    const product = await Product.findByIdAndDelete(id);
    console.log(product)
    if (!product) {
      return sendJSON(res, 404, { error: "Product not found" });
    }

    return sendJSON(res, 200, { message: "Product deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    return sendJSON(res, 500, { error: "Server error" });
  }
};
