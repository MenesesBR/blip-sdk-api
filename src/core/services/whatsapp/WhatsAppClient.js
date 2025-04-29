const axios = require('axios');
const logger = require('../../../config/logger');
const config = require('../../../config/environment');

class WhatsAppClient {
    constructor() {
        this.baseUrl = `${config.meta.baseUrl}`;
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    async sendMessage(message, botData) {
        const url = `${this.baseUrl}/${botData.metaPhoneNumberId}/messages`;
        this.headers.Authorization = `Bearer ${botData.metaAuthToken}`;

        const response = await axios.post(
            url,
            message,
            {
                headers: this.headers
            }
        );

        return response.data;
    }
}

module.exports = new WhatsAppClient(); 