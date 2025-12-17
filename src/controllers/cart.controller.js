const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const { sendJSON } = require("../utils/response");

exports.addToCart = async (req, res, body) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = body;

    if (!productId) {
      return sendJSON(res, 400, { error: "productId required" });
    }

    const qty = quantity ? Number(quantity) : 1;

    if (qty < 1) {
      return sendJSON(res, 400, { error: "Quantity must be at least 1" });
    }

    // 🔹 Find product
    const product = await Product.findById(productId);
    if (!product) {
      return sendJSON(res, 404, { error: "Product not found" });
    }

    // 🔹 Stock check
    if (product.stock < qty) {
      return sendJSON(res, 400, { error: "Not enough stock available" });
    }

    // 🔹 Find cart
    let cart = await Cart.findOne({ userId });

    // 🔹 If cart doesn't exist → create
    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity: qty,
            priceAtThatTime: product.price
          }
        ]
      });

      return sendJSON(res, 201, {
        message: "Product added to cart",
        cart
      });
    }

    // 🔹 Cart exists → check if product already added
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Product already in cart → increase quantity
      cart.items[itemIndex].quantity += qty;

      // Stock check again
      if (cart.items[itemIndex].quantity > product.stock) {
        return sendJSON(res, 400, { error: "Stock limit exceeded" });
      }
    } else {
      // New product in cart
      cart.items.push({
        productId,
        quantity: qty,
        priceAtThatTime: product.price
      });
    }

    await cart.save();

    return sendJSON(res, 200, {
      message: "Cart updated",
      cart
    });

  } catch (error) {
    console.error("Add to cart error:", error);
    return sendJSON(res, 500, { error: "Server error" });
  }
};


exports.updateCartItem = async (req, res, body) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = body;

    if (!productId || quantity === undefined) {
      return sendJSON(res, 400, { error: "productId and quantity required" });
    }

    const qty = Number(quantity);

    if (qty < 0) {
      return sendJSON(res, 400, { error: "Quantity cannot be negative" });
    }

    // 🔹 Find cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return sendJSON(res, 404, { error: "Cart not found" });
    }

    // 🔹 Find item
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return sendJSON(res, 404, { error: "Product not in cart" });
    }

    // 🔹 If quantity = 0 → remove item
    if (qty === 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();

      return sendJSON(res, 200, {
        message: "Item removed from cart",
        cart
      });
    }

    // 🔹 Stock check
    const product = await Product.findById(productId);
    if (!product) {
      return sendJSON(res, 404, { error: "Product not found" });
    }

    if (qty > product.stock) {
      return sendJSON(res, 400, { error: "Stock limit exceeded" });
    }

    // 🔹 Update quantity
    cart.items[itemIndex].quantity = qty;
    await cart.save();

    return sendJSON(res, 200, {
      message: "Cart item updated",
      cart
    });

  } catch (error) {
    console.error("Update cart error:", error);
    return sendJSON(res, 500, { error: "Server error" });
  }
};
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔹 Find cart and populate product
    const cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "name price images stock"
    );

    if (!cart || cart.items.length === 0) {
      return sendJSON(res, 200, {
        items: [],
        totalAmount: 0
      });
    }

    let totalAmount = 0;

    const items = cart.items.map(item => {
      const subtotal = item.quantity * item.priceAtThatTime;
      totalAmount += subtotal;

      return {
        product: {
          id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.images?.[0] || null,
          stock: item.productId.stock
        },
        quantity: item.quantity,
        priceAtThatTime: item.priceAtThatTime,
        subtotal
      };
    });

    return sendJSON(res, 200, {
      items,
      totalAmount
    });

  } catch (error) {
    console.error("Get cart error:", error);
    return sendJSON(res, 500, { error: "Server error" });
  }
};
exports.removeFromCart = async (req, res, productId) => {
  try {
    const userId = req.user.id;

    // 🔹 Find cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return sendJSON(res, 404, { error: "Cart not found" });
    }

    const initialLength = cart.items.length;

    // 🔹 Remove item
    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      return sendJSON(res, 404, { error: "Product not in cart" });
    }

    await cart.save();

    return sendJSON(res, 200, {
      message: "Item removed from cart",
      cart
    });

  } catch (error) {
    console.error("Remove from cart error:", error);
    return sendJSON(res, 500, { error: "Server error" });
  }
};
