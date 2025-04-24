const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const MessageService = require('../core/services/message/MessageService');
/**
 * @swagger
 * tags:
 *   name: BLIP
 *   description: Endpoints for BLIP platform integration
 */

/**
 * @swagger
 * /api/blip/messages:
 *   post:
 *     summary: Send a message through BLIP SDK
 *     description: Sends a message to a recipient using BLIP SDK
 *     tags: [BLIP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *                 description: Recipient identifier
 *                 example: "5531999999999@wa.gw.msging.net"
 *               content:
 *                 type: string
 *                 description: Message content
 *                 example: "Hello, how can I help you?"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Sent message ID
 *                 status:
 *                   type: string
 *                   description: Sending status
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/messages', (req, res) => {
    // Here will be implemented the integration with BLIP SDK
    MessageService.processMessageSend(req.body);
    res.status(200);
    logger.info(`Message received: ${JSON.stringify(req.body)}`);
});

/**
 * @swagger
 * /api/blip/status:
 *   get:
 *     summary: Check BLIP connection status
 *     description: Returns the current connection status with BLIP platform
 *     tags: [BLIP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "connected"
 *                 timestamp:
 *                   type: string
 *                   example: "2024-04-24T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 */
router.get('/status', (req, res) => {
    res.status(200).json({
        status: 'connected',
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 