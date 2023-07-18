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
                args: [
                    '--disable-gpu',
                    '--disable-setuid-sandbox',
                    '--disable-extensions',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-sandbox',
                ],
            },
        });

        client.initialize();

        return client;
    }
};