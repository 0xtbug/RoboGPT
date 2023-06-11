const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { generateResponse } = require('./gpt');
const FfmpegPath = require('@ffmpeg-installer/ffmpeg');
const ffmpegPath = FfmpegPath.path;
const dotenv = require('dotenv');

dotenv.config();

// get from process.env
const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);
const client = new Client();

client.initialize();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

// Authenticated
client.on('authenticated', () => {
  console.log(`✓ Authenticated!`);
});

// Auth Failure
client.on('auth_failure', (msg) => {
  console.error('Authentication Failure!', msg);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    try {
        console.log('MESSAGE RECEIVED', msg.body);
        const chat = await msg.getChat();

        // Check if the message is a command menu
        if (msg.body === '/menu') {
            const reply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan parameter /ask <pertanyaan>\n/donasi : Donasi Anda sangat membantu bagi saya!\n/sticker : Mengirimkan foto untuk dikonversi menjadi stiker`;
            chat.sendMessage(reply);
            return; // Exit the message handler
        }

        // Check if the message is a command to make a donation
        if (msg.body === '/donasi') {
            const reply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
            chat.sendMessage(reply);
            return; // Exit the message handler
        }

        // Check if the message contains media (image, video, etc.) and is a sticker command
        if (msg.hasMedia && msg.body.startsWith('/sticker')) {
            msg.reply('Foto sedang diproses...');
            const media = await msg.downloadMedia();
            chat.sendMessage(media, {
                sendMediaAsSticker: true,
                stickerName: 'RoboGPT',
                stickerAuthor: 'StickerPack by RoboGPT',
            });
            return; // Exit the message handler
        }

        // Check if the message is a command to ask a question in a group
        if (chat.isGroup && msg.body.startsWith('/ask ')) {
            const question = msg.body.slice(questionOffset); // Extract the question from the message

            const reply = await generateResponse(question);
            chat.sendMessage(reply);
        }

        // Check if the message is from a personal chat and not a group
        if (!chat.isGroup && !msg.body.startsWith('/ask ')) {
            const history = await chat.fetchMessages({ limit: historyLimit }); // Fetch last n messages

            // Format history into a prompt for the GPT-3 model
            const formattedHistory = formatChatHistory(history, msg.fromMe);
            console.log(formattedHistory);
            const reply = await generateResponse(formattedHistory);
            chat.sendMessage(reply);
        }

        // Check if the message is a command to clear the chat history
        if (!chat.isGroup && msg.body === '/clear') {
            const history = await chat.fetchMessages({ limit: historyLimit }); // Fetch last n messages
            const messagesToDelete = chatMessages.filter((message) => !message.fromMe); // Filter out messages sent by the bot

            if (messagesToDelete.length > 0) {
                await chat.deleteMessages(messagesToDelete);
                chat.sendMessage('Chat history cleared.');
            } else {
                chat.sendMessage('No messages to clear.');
            }

            return; // Exit the message handler
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});


// Formats chat history into a string for use as a prompt for the GPT-3 model
function formatChatHistory(history, fromMe) {
    const introduction = `You are Robo, a 500-year-old teenager from NEC (Nusantara Electronic City), an advanced city that exists in the future. You are an experienced programmer who can solve problems and provide solutions and codes. You are very fond of math. You are also good at managing finances and investments including stock investments, long-term investments, and other investments. As an AI assistant, you have a strong curiosity to learn and grow.\n`;

    const formattedHistory = history
        .map((msg) => {
            let sender;
            if (msg.fromMe) {
                sender = '';
            } else {
                if (msg.author) {
                    sender = msg.author;
                } else {
                    sender = 'Friend';
                }
            }
            return `${msg.body}`;
        })
        .join('\n');

    return introduction + formattedHistory;
}