const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function signAccess(payload, expiresIn = '45m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function signRefresh(payload, expiresIn = '30d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signAccess, signRefresh, verifyToken };
