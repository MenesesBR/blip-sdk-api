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

    async initializeClient(userId, userPassword, botId, userPhoneNumber, userDomain, userIdWithDomain) {
        try {

            if (this.clients.has(userId)) {
                logger.info(`Client already initialized for ${userId}`);
                return this.clients.get(userId);
            }

            logger.info(`Connecting user: ${userId} with bot_id: ${botId}`);
            let client = this.blipClient.createClient(userId, userPassword);

            this.messageReceiver(client, userId, userPhoneNumber);

            // Adiciona listener para mensagens recebidas do BLIP
            try {
                // Conecta o cliente
                await client.connect();
                logger.info(`BLIP client connected for ${userId} with bot_id: ${botId}`);
            } catch (error) {
                logger.info(`Error connecting BLIP client for ${userId}:`, error);
                client = await this.blipClient.connectAsGuest(userId, userPassword, client);
                this.messageReceiver(client, userId, userPhoneNumber);
            }

            // Armazena o cliente e retorna também o botId
            this.clients.set(userId, { client, botId });
            return { client, botId };
        } catch (error) {
            logger.error('Error initializing BLIP client:', error);
            throw error;
        }
    }

    async messageReceiver(client, userId, userPhoneNumber) {
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
            const botData = this.receivedMessagesBotsData.get(message.from.split('@')[0]);

            await messageProcessor.processMessage(message, userPhoneNumber, botData);
            this.messageQueue.delete(userId);
        } catch (error) {
            logger.error('Error handling BLIP response:', error);
        }
    }

    async sendMessage(content) {
        try {
            this.receivedMessagesBotsData.set(content.blipBotId, { metaAuthToken: content.metaAuthToken, metaPhoneNumberId: content.metaPhoneNumberId });
            const userIdWithDomain = `${content.userId}@${content.userDomain}`;
            // Inicializa o cliente se necessário
            const { client, botId } = await this.initializeClient(content.userId, content.userPassword, content.blipBotId, content.userPhoneNumber, content.userDomain, userIdWithDomain);
            const message = content.message;
            const { text, interactive } = message;
            let messageText;

            // Adiciona a mensagem à fila de espera
            this.messageQueue.set(content.userId, {
                message,
                timestamp: Date.now()
            });

            if (interactive) {
                if (interactive.type === 'button_reply') {
                    messageText = interactive.button_reply.title;
                    logger.info(`Selected button: ${messageText}`);
                } else if (interactive.type === 'list_reply') {
                    messageText = interactive.list_reply.title;
                    logger.info(`Selected item: ${messageText}`);
                }
            } else if (text) {
                messageText = text.body;
            }

            if (!messageText) {
                return;
            }

            logger.info(`Sending message to BLIP for user ${content.userId}:`, messageText);

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
                userId: userId,
                phoneNumberId: phoneNumberId,
                messageType: message.type,
                messageContent: message.text?.body || message.interactive?.type
            });
            return false;
        }
    }
}

module.exports = new BlipMessageService(); 