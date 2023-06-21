const qrcode = require('qrcode-terminal');

module.exports = {
    generateQRCode: (qr) => {
        console.log(`QR RECEIVED ${qr}`);
        qrcode.generate(qr, {
            small: true
        });
    }
};