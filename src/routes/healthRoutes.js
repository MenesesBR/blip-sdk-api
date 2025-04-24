const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API status
 *     description: Returns the current API status
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   example: "2024-04-24T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
    logger.info('Health check OK');
});

module.exports = router; 