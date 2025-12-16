const Product = require("../models/product.model");
const { sendJSON } = require("../utils/response");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs");
const Product = require("../models/product.model");
const { sendJSON } = require("../utils/response");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs");
const Product = require("../models/product.model");
const { sendJSON } = require("../utils/response");
exports.uploadProductImage = async (req, res, productId) => {
  const uploadDir = path.join(__dirname, "../uploads/products");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true,
    multiples: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return sendJSON(res, 400, { error: "Image upload failed" });
    }

    const file = files.image;
    if (!file) {
      return sendJSON(res, 400, { error: "Image required" });
    }

    const savedPaths = [];

    const saveFile = (f) => {
      const newName = Date.now() + "-" + f.originalFilename;
      const newPath = path.join(uploadDir, newName);
      fs.renameSync(f.filepath, newPath);
      savedPaths.push(`/uploads/products/${newName}`);
    };

    if (Array.isArray(file)) {
      file.forEach(saveFile);
    } else {
      saveFile(file);
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { $push: { images: { $each: savedPaths } } },
      { new: true }
    );

    if (!product) {
      return sendJSON(res, 404, { error: "Product not found" });
    }

    return sendJSON(res, 200, {
      message: "Image uploaded",
      images: product.images
    });
  });
};

// Create product (admin)




exports.createProduct = async (req, res) => {
  const uploadDir = path.join(__dirname, "../uploads/products");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true,
    multiples: true
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        return sendJSON(res, 400, { error: "Form parse error" });
      }

      // 🔹 TEXT FIELDS
      const name = fields.name?.[0];
      const price = fields.price?.[0];
      const description = fields.description?.[0] || "";
      const inStock = fields.inStock ? fields.inStock[0] === "true" : true;
      const tags = fields.tags ? fields.tags[0].split(",").map(t => t.trim()) : [];

      if (!name || !price) {
        return sendJSON(res, 400, { error: "name and price required" });
      }

      // 🔹 IMAGE HANDLING
      const images = [];
      const file = files.image;

      if (file) {
        const saveFile = (f) => {
          const newName = Date.now() + "-" + f.originalFilename;
          const newPath = path.join(uploadDir, newName);
          fs.renameSync(f.filepath, newPath);
          images.push(`/uploads/products/${newName}`);
        };

        if (Array.isArray(file)) {
          file.forEach(saveFile);
        } else {
          saveFile(file);
        }
      }

      // 🔹 CREATE PRODUCT
      const product = await Product.create({
        name,
        description,
        price: Number(price),
        inStock,
        tags,
        images,
        createdBy: req.user.id
      });

      return sendJSON(res, 201, {
        message: "Product created with image",
        product
      });

    } catch (error) {
      console.error(error);
      return sendJSON(res, 500, { error: "Server error" });
    }
  });
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
