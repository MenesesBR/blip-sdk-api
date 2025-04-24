const express = require('express');
const router = express.Router();
const { generateToken } = require('../config/auth');
const logger = require('../config/logger');
const config = require('../config/environment');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user
 *     description: Returns a JWT token for authentication
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Here you should implement the credentials verification logic
    // This is just a basic example
    if (username === config.jwtAuth.username && password === config.jwtAuth.password) {
        logger.info(`User ${username} logged in`);
        const token = generateToken({ username });
        return res.json({ token });
    }

    logger.error(`Invalid credentials for user ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router; 