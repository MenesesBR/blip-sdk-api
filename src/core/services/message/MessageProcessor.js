const WhatsAppClient = require('../whatsapp/WhatsAppClient');
const logger = require('../../../config/logger');

class MessageProcessor {
    async processMessage(message, userPhoneNumber, botData) {
        try {
            logger.info(`Processing message: ${JSON.stringify(message)}`);

            const convertedMessage = this.messageConverter(message, userPhoneNumber);
            await WhatsAppClient.sendMessage(convertedMessage, botData);
            return true

        } catch (error) {
            logger.error('Error processing message', error);
            throw error;
        }
    }

    messageConverter(blipMessage, toNumber) {
        const base = {
            messaging_product: "whatsapp",
            to: toNumber
        }

        switch (blipMessage.type) {
            case "text/plain":
                return {
                    ...base,
                    type: "text",
                    text: {
                        body: blipMessage.content
                    }
                }

            case "application/vnd.lime.select+json":
                if (blipMessage.content.options.length <= 3) {
                    return {
                        ...base,
                        type: "interactive",
                        interactive: {
                            type: "button",
                            body: {
                                text: blipMessage.content.text || "Escolha uma opção:"
                            },
                            action: {
                                buttons: blipMessage.content.options.map(opt => ({
                                    type: "reply",
                                    reply: {
                                        id: String(opt.order || opt.text),
                                        title: opt.text
                                    }
                                }))
                            }
                        }
                    }
                } else {
                    return {
                        ...base,
                        type: "interactive",
                        interactive: {
                            type: "list",
                            body: {
                                text: blipMessage.content.text
                            },
                            action: {
                                button: "Ver opções",
                                sections: [
                                    {
                                        title: blipMessage.content.title || "Opções",
                                        rows: blipMessage.content.options.map(item => ({
                                            id: item.id || item.text,
                                            title: item.text
                                        }))
                                    }
                                ]
                            }
                        }
                    }
                }

            case "application/vnd.lime.collection+json":
                const items = blipMessage.content.items;
                return {
                    ...base,
                    type: "interactive",
                    interactive: {
                        type: "list",
                        body: {
                            text: "Veja as opções abaixo:"
                        },
                        action: {
                            button: "Ver opções",
                            sections: items.map((item, index) => ({
                                title: item.header?.value?.title || `Item ${index + 1}`,
                                rows: item.options.map((opt, index) => ({
                                    id: `Option ${index + 1}`,
                                    title: opt.label.value
                                }))
                            }))
                        }
                    }
                }

            case "application/vnd.lime.media-link+json":
                const media = blipMessage.content;
                const mediaType = getMediaType(media.type);
                if (!mediaType) throw new Error("Tipo de mídia não suportado");

                let body = {
                    ...base,
                    type: mediaType,
                    [mediaType]: {
                        link: media.uri
                    }
                }

                if (media.title) {
                    body[mediaType].caption = media.title;
                }

                return body

            case "application/vnd.lime.location+json":
                const location = blipMessage.content;
                return {
                    ...base,
                    type: "location",
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        name: location.text || undefined,
                        address: location.text || undefined
                    }
                }

            case "application/vnd.lime.web-link+json":
                const content = blipMessage.content;
                return {
                    ...base,
                    type: "interactive",
                    interactive: {
                        type: "cta_url",
                        body: {
                            text: content.text
                        },
                        action: {
                            name: "cta_url",
                            "parameters": {
                                "display_text": content.title,
                                "url": content.uri
                            }
                        }
                    }
                }

            default:
                throw new Error(`Tipo não suportado: ${blipMessage.type}`);
        }

        function getMediaType(mimeType) {
            if (!mimeType) return null;
            if (mimeType.startsWith("image/")) return "image";
            if (mimeType.startsWith("sticker/")) return "sticker";
            if (mimeType.startsWith("audio/") || mimeType.startsWith("voice/")) return "audio";
            if (mimeType.startsWith("video/")) return "video";
            if (mimeType === "application/pdf") return "document";
            return null;

        }
    }
}
module.exports = new MessageProcessor(); 