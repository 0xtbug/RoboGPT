const { generateQRCode } = require('./auth/qrcode.js');
const { initializeClient } = require('./auth/auth.js');
const { handleMessage } = require('./handlers/message.js');

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
});

client.on('message', handleMessage);