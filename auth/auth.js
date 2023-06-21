const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

module.exports = {
    initializeClient: () => {
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'client',
                dataPath: './sessions',
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox'],
            },
        });

        client.initialize();

        return client;
    }
};