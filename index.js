const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { handleIncomingMessage } = require('./lib/whatsapp');

dotenv.config();

const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'client',
      dataPath: './sessions',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox'],
    },
    authTimeoutMs: 0,
    qrMaxRetries: 0,
    takeoverOnConflict: false,
    takeoverTimeoutMs: 0,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
    bypassCSP: false,
    proxyAuthentication: undefined
  });
  
client.on('qr', (qr) => {
  console.log(`QR RECEIVED ${qr}`);
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✓ Authenticated!');
});

client.on('auth_failure', (msg) => {
  console.error('Authentication Failure!', msg);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', async (msg) => {
  try {
    console.log(`MESSAGE RECEIVED ${msg.body}`);
    await handleIncomingMessage(msg, client);
  } catch (error) {
    await Promise.all([msg.react('❌'), console.error('Error handling message:', error)]);
  }
});

client.initialize();