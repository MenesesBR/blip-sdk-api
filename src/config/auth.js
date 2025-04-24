const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Authentication settings
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'; // Default: 24 hours
// Expiration time options:
// '1h' - 1 hour
// '24h' - 24 hours
// '7d' - 7 days
// '30d' - 30 days
// '365d' - 1 year

/**
 * Generates a JWT token
 * @param {Object} payload - Data to be included in the token
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies if a password matches the hash
 * @param {String} password - Plain text password
 * @param {String} hash - Password hash
 * @returns {Boolean}
 */
const verifyPassword = (password, hash) => {
    return bcrypt.compareSync(password, hash);
};

/**
 * Generates a password hash
 * @param {String} password - Plain text password
 * @returns {String} Password hash
 */
const hashPassword = (password) => {
    return bcrypt.hashSync(password, 10);
};

module.exports = {
    generateToken,
    verifyPassword,
    hashPassword,
    JWT_SECRET,
    JWT_EXPIRES_IN
}; 