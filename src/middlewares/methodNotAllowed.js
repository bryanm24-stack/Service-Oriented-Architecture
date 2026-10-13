// Pasang melalui .all() SETELAH handler metode yang diizinkan.
module.exports = (...allowed) => (req, res) =>
res.set("Allow", allowed.join(", ")).status(405).json({
    msg: `Method ${req.method} tidak diizinkan untuk endpoint ini`,
    allowed,
});
