const logger = require('../../../config/logger');
const blipMessageService = require('../blip/BlipMessageService');
const messageProcessor = require('./MessageProcessor');
const { v4: uuidv4 } = require('uuid');

class MessageService {
    constructor() {
        this.receivedMessagesBotsData = new Map();
    }
    async processMessageSend(content) {
        try {
            logger.log(`Starting message processing for ${content}`);

            // Envia a mensagem para o BLIP
            const success = await blipMessageService.sendMessage(content);
            
            if (success) {
                logger.log(`Message sent successfully to BLIP: ${content}`);
                return true;
            } else {
                logger.error(`Failed to send message to BLIP: ${content}`);
                return false;
            }
        } catch (error) {
            logger.error(`Error processing message for ${content}`, error);
            return false;
        }
    }

    async processBlipResponse(message) {
        try {
            return await messageProcessor.processMessage(message);
        } catch (error) {
            logger.error('Error processing BLIP response', error);
            return false;
        }
    }

    async getBotData(blipBotId) {
        try {
            return this.receivedMessagesBotsData.get(blipBotId);
        } catch (error) {
            logger.error('Error getting bot data', error);
            return false;
        }
    }
}

module.exports = new MessageService(); 