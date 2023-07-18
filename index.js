const { generateQRCode } = require('./auth/qrcode.js');
const { initializeClient } = require('./auth/auth.js');
const { handleMessage } = require('./handlers/message.js');
const dotenv = require('dotenv');
dotenv.config();

const client = initializeClient();

client.on('qr', generateQRCode);

client.on('authenticated', () => {
  console.log('✓ Authenticated!');
});

client.on('auth_failure', (msg) => {
  console.error('Authentication Failure!', msg);
});

client.on('ready', () => {
  console.log('Client is ready!');
  // client.sendMessage(process.env.OWNER_NUMBER + '@c.us', 'Bot is now Active ✅')
});

client.on('disconnected', () => {
  console.log('whatsapp disconnected');
});

client.on('message', handleMessage);