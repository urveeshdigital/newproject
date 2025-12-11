const { sendJSON } = require("../utils/response");

// roles: array of allowed roles, e.g. ["admin"]
module.exports = (roles = []) => {
  return (req, res, next) => {
    try {
      // ensure user info available (from auth middleware)
      if (!req.user) return sendJSON(res, 401, { error: "Unauthorized" });

      if (!Array.isArray(roles) || roles.length === 0) {
        // no role restriction -> allow
        return next();
      }

      if (roles.includes(req.user.role)) {
        return next();
      } else {
        return sendJSON(res, 403, { error: "Forbidden: insufficient role" });
      }
    } catch (err) {
      return sendJSON(res, 500, { error: "Server error" });
    }
  };
};
