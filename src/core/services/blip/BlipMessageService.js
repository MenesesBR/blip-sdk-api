const logger = require('../../../config/logger');
const BlipClient = require('./BlipClient');
const { v4: uuidv4 } = require('uuid');
const messageProcessor = require('../message/MessageProcessor');

class BlipMessageService {
    constructor() {
        this.messageQueue = new Map();
        this.clients = new Map();
        this.blipClient = BlipClient;
        this.receivedMessagesBotsData = new Map();
    }

    async initializeClient(userId, userPassword, botId, userPhoneNumber) {
        try {
            if (this.clients.has(userId)) {
                logger.info(`Client already initialized for ${userId}`);
                return this.clients.get(userId);
            }

            logger.info(`Connecting user: ${userId} with bot_id: ${botId}`);
            let client = this.blipClient.createClient(userId, userPassword);

            await this.connectClient(client, userId, botId, userPhoneNumber);

            this.clients.set(userId, { client, botId });
            return { client, botId };
        } catch (error) {
            logger.error('Error initializing BLIP client:', error);
            throw error;
        }
    }

    async connectClient(client, userId, botId, userPhoneNumber) {
        try {
            await client.connect();
            logger.info(`BLIP client connected for ${userId} with bot_id: ${botId}`);
        } catch (error) {
            logger.info(`Error connecting BLIP client for ${userId}:`, error);
            client = await this.blipClient.connectAsGuest(userId, userPassword, client);
            logger.info(`Guest connection established for ${userId}`);
        } finally {
            this.registerMessageReceiver(client, userId, userPhoneNumber);
        }
    }

    registerMessageReceiver(client, userId, userPhoneNumber) {
        client.addMessageReceiver((message) => {
            if (message.type === 'application/vnd.lime.chatstate+json') {
                logger.info('Received chat state change:', message);
                return;
            }

            logger.info('Received message:', message);
            this.handleBlipResponse(message, userId, userPhoneNumber);
        });
    }

    async handleBlipResponse(message, userId, userPhoneNumber) {
        try {
            logger.info(`Received message from BLIP for ${userId}:`, message);

            const sender = message.from?.split('@')[0];
            const botData = this.receivedMessagesBotsData.get(sender);

            await messageProcessor.processMessage(message, userPhoneNumber, botData);
            this.messageQueue.delete(userId);
        } catch (error) {
            logger.error('Error handling BLIP response:', error);
        }
    }

    async sendMessage(content) {
        try {
            const { userId, userPassword, blipBotId, userPhoneNumber, userDomain, message } = content;
            const userIdWithDomain = `${userId}@${userDomain}`;

            this.receivedMessagesBotsData.set(blipBotId, {
                metaAuthToken: content.metaAuthToken,
                metaPhoneNumberId: content.metaPhoneNumberId
            });

            const { client, botId } = await this.initializeClient(userId, userPassword, blipBotId, userPhoneNumber, userDomain, userIdWithDomain);

            this.messageQueue.set(userId, { message, timestamp: Date.now() });

            const messageText = this.extractMessageText(message);
            if (!messageText) return;

            logger.info(`Sending message to BLIP for user ${userId}:`, messageText);

            const blipMessage = {
                id: uuidv4(),
                to: `${botId}@msging.net`,
                type: 'text/plain',
                content: messageText
            };

            await client.sendMessage(blipMessage);
            logger.info('Message sent successfully to BLIP');
            return true;

        } catch (error) {
            logger.error('Error sending message to BLIP:', {
                error: error.message,
                stack: error.stack,
                userId: content?.userId,
                phoneNumberId: content?.metaPhoneNumberId,
                messageType: content?.message?.type,
                messageContent: content?.message?.text?.body || content?.message?.interactive?.type
            });
            return false;
        }
    }

    extractMessageText(message) {
        if (message.interactive) {
            const { interactive } = message;
            if (interactive.type === 'button_reply') {
                logger.info(`Selected button: ${interactive.button_reply.title}`);
                return interactive.button_reply.title;
            } else if (interactive.type === 'list_reply') {
                logger.info(`Selected item: ${interactive.list_reply.title}`);
                return interactive.list_reply.title;
            }
        } else if (message.text) {
            return message.text.body;
        }
        return null;
    }
}

module.exports = new BlipMessageService();