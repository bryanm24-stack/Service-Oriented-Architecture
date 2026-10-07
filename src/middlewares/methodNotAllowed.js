/**
 * Middleware untuk HTTP 405 Method Not Allowed.
 *
 * Digunakan ketika URL memang tersedia,
 * tetapi HTTP method yang digunakan tidak diperbolehkan.
 */

const methodNotAllowed = (...allowed) => {
  return (req, res) => {
    return res
      .set("Allow", allowed.join(", "))
      .status(405)
      .json({
        msg: `Method ${req.method} tidak diizinkan untuk endpoint ini`,
        allowed,
      });
  };
};

module.exports = methodNotAllowed;