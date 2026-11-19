const httpError = (status, message, code = null) => {
  const error = new Error(message);

  error.status = status;

  error.expose = true;
  if (code) error.code = code;

  return error;
};

module.exports = httpError;
