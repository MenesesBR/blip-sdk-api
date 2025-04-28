const BlipSdk = require('blip-sdk');
const WebSocketTransport = require('lime-transport-websocket');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../config/logger');

class BlipClient {
    constructor() {
        this.wsUri = "wss://ws.0mn.io:443";
        this.wsUriScheme = this.wsUri.match(/^(\w+):\/\//)[1];
        this.wsUriHostname = this.wsUri.match(/:\/\/([^:\/]+)([:\/]|$)/)[1];
        this.wsUriPort = this.wsUri.match(/:(\d+)/) ? this.wsUri.match(/:(\d+)/)[1] : 8081;
        this.domain = "0mn.io";
    }

    createClient(userId, password) {
        logger.info(`Creating client for identity: ${userId}`);
        return new BlipSdk.ClientBuilder()
            .withIdentifier(userId)
            .withPassword(password)
            .withScheme(this.wsUriScheme)
            .withHostName(this.wsUriHostname)
            .withPort(this.wsUriPort)
            .withDomain(this.domain)
            .withTransportFactory(() => new WebSocketTransport())
            .build();
    }

    createGuestClient(identity) {
        logger.info(`Creating guest client for identity: ${identity}`);
        return new BlipSdk.ClientBuilder()
            .withScheme(this.wsUriScheme)
            .withHostName(this.wsUriHostname)
            .withPort(this.wsUriPort)
            .withDomain(this.domain)
            .withTransportFactory(() => {
                return new WebSocketTransport({
                    localNode: identity
                });
            })
            .build();
    }

    async connectAsGuest(userId, password) {
        console.log('Iniciando conexão como guest...');
        const guestIdentifier = uuidv4();
        const guestNode = `${guestIdentifier}@${this.domain}/default`;

        console.log(`Identidade gerada: ${userId}`);
        console.log(`Guest identifier: ${guestIdentifier}`);

        const guestClient = await this.createGuestClient(userId);
        console.log('Conectando como guest...');
        await guestClient.connectWithGuest(guestIdentifier);
        console.log('Conexão guest estabelecida');

        const createAccountCommand = {
            id: uuidv4(),
            from: userId,
            pp: guestNode,
            method: 'set',
            type: 'application/vnd.lime.account+json',
            uri: '/account',
            resource: {
                password: password
            }
        };

        console.log('Criando conta...');
        await guestClient.sendCommand(createAccountCommand);
        console.log('Conta criada com sucesso');

        const client = this.createClient(userId, password);
        await client.connect();
        return client;
    }

    generateRandomPassword() {
        return Buffer.from(Math.random().toString()).toString('base64').slice(0, 8);
    }
}

module.exports = new BlipClient(); 