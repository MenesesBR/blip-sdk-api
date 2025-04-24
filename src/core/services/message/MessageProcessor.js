const WhatsAppClient = require('../whatsapp/WhatsAppClient');
const logger = require('../../../config/logger');

class MessageProcessor {
    async processMessage(message, userPhoneNumber, botData) {
        try {
            logger.info(`Processing message: ${JSON.stringify(message)}`);
            
            if (message.type === 'application/vnd.lime.select+json') {
                await this.processSelectMessage(message, userPhoneNumber, botData);
            } else if (message.type === 'text/plain') {
                await this.processTextMessage(message, userPhoneNumber, botData);
            } else {
                logger.info(`Ignoring message of type: ${message.type}`);
            }
        } catch (error) {
            logger.error('Error processing message', error);
            throw error;
        }
    }

    async processSelectMessage(message, userPhoneNumber, botData) {
        try {
            logger.info(`Processing select message: ${JSON.stringify(message)}`);
            
            const text = message.content.text;
            const options = message.content.options;
            
            if (!options || options.length === 0) {
                logger.info('No options found in select message');
                return;
            }
            
            if (options.length <= 3) {
                // Cria quick reply (botões)
                const buttons = options.map(option => ({
                    text: option.text
                }));

                await WhatsAppClient.sendInteractiveMessage(userPhoneNumber, text, buttons, botData);
            } else {
                // Cria lista
                const listMessage = {
                    title: text,
                    description: 'Selecione uma opção',
                    sections: [{
                        title: 'Opções',
                        items: options.map(option => ({
                            title: option.text,
                            next_step: option.text
                        }))
                    }]
                };

                await WhatsAppClient.sendListMessage(userPhoneNumber, text, listMessage);
            }

            return true;
        } catch (error) {
            logger.error('Error processing select message', error);
            throw error;
        }
    }

    async processTextMessage(message, userPhoneNumber, botData) {
        try {
            logger.info(`Processing text message: ${JSON.stringify(message)}`);
            await WhatsAppClient.sendMessage(userPhoneNumber, message, botData);
        } catch (error) {
            logger.error('Error processing text message', error);
            throw error;
        }
    }
}

module.exports = new MessageProcessor(); 