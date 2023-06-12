const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { handleIncomingMessage } = require('./lib/whatsapp');

dotenv.config();

const client = new Client();

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