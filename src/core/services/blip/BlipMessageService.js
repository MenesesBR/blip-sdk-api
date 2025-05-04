const logger = require('../../../config/logger');
const BlipClient = require('./BlipClient');
const { v4: uuidv4 } = require('uuid');
const messageProcessor = require('../message/MessageProcessor');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../../config/environment');
const mime = require('mime-types');


class BlipMessageService {
    constructor() {
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

            const messageFormatted = await this.messageConverter(message, content.metaAuthToken, blipBotId);

            logger.info(`Sending message to BLIP for user ${userId}:`, messageFormatted.content);

            const blipMessage = {
                id: message.id || uuidv4(),
                to: `${botId}@msging.net`,
                type: messageFormatted.type,
                content: messageFormatted.content
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

    async messageConverter(metaMessage, metaAuthToken, blipBotId) {
        if (!metaMessage || !metaMessage.type) {
            throw new Error("Invalid message");
        }

        switch (metaMessage.type) {
            case "text":
                return {
                    type: "text/plain",
                    content: metaMessage.text.body
                }

            case "interactive":
                switch (metaMessage.interactive.type) {
                    case "button_reply":
                    case "list_reply":
                        return {
                            type: "application/vnd.lime.reply+json",
                            content: {
                                "replied": {
                                    "type": "text/plain",
                                    "value": metaMessage.interactive[metaMessage.interactive.type].title
                                }
                            }
                        }
                    default:
                        throw new Error(`Not supported interactive message: ${metaMessage.interactive.type}`);
                }

            case "image":
            case "video":
            case "audio":
            case "sticker":
            case "document":
                const mediaContent = metaMessage[metaMessage.type];
                return {
                    type: "application/vnd.lime.media-link+json",
                    content: {
                        uri: await this.getMetaMediaLink(mediaContent.id, metaAuthToken, blipBotId),
                        type: mediaContent.mime_type
                        //title: mediaContent.caption || undefined
                    }
                }

            case "location":
                return {
                    type: "application/vnd.lime.location+json",
                    content: {
                        latitude: metaMessage.location.latitude,
                        longitude: metaMessage.location.longitude,
                        altitude: 0,
                        text: metaMessage.location.name || metaMessage.location.address || undefined
                    }
                }

            default:
                throw new Error(`Tipo não suportado: ${metaMessage.type}`);
        }
    }

    getMimeType(metaType) {
        switch (metaType) {
            case "image": return "image/jpeg";
            case "video": return "video/mp4";
            case "audio": return "audio/ogg";
            case "sticker": return "sticker/webp";
            case "document": return "application/pdf";
            default: return null;
        }
    }

    async getMetaMediaLink(mediaId, metaAuthToken, blipBotId) {
        const metaUrl = `https://graph.facebook.com/v22.0/${mediaId}/`;
        const metaResponse = await axios({
            method: 'GET',
            url: metaUrl,
            responseType: 'application/json',
            headers: {
                Authorization: `Bearer ${metaAuthToken}`
            }
        });

        const metaResponseData = JSON.parse(metaResponse.data);
        const mediaMimeType = metaResponseData.mime_type;
        const metaMediaUrl = metaResponseData.url;

        const mediaResponse = await axios({
            method: 'GET',
            url: metaMediaUrl,
            responseType: 'stream',
            headers: {
                Authorization: `Bearer ${metaAuthToken}`
            }
        });

        const mediaExtension = mime.extension(mediaMimeType) || 'bin'
        const mediaResponseStream = mediaResponse.data;

        const form = new FormData();
        form.append('file', mediaResponseStream, {
            filename: uuidv4() + '.' + mediaExtension,
            contentType: mediaMimeType
        });

        const headers = {
            ...form.getHeaders(),
            'Authorization': `Bearer ${config.bucket.apiKey}`,
            'x-client-id': blipBotId
        };

        const bucketResponse = await axios.post(`${config.bucket.baseUrl}/upload`, form, {
            headers: headers,
            maxBodyLength: Infinity,
        });

        if (!bucketResponse.status || bucketResponse.status !== 200) {
            throw new Error(`Failed to upload media to bucket: ${bucketResponse.statusText}`);
        }

        const bucketUrl = bucketResponse.data.filePath;

        return bucketUrl;

    }

}

module.exports = new BlipMessageService();