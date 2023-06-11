const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { generateResponse, summarizeText } = require('./gpt');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
const dotenv = require('dotenv');

dotenv.config();

const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);
const client = new Client();
client.initialize();

client.on('qr', (qr) => {
  console.log(`QR RECEIVED ${qr}`);
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log(`✓ Authenticated!`);
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
    const chat = await msg.getChat();

    switch (msg.body) {
      case '/menu':
        const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan parameter /ask <pertanyaan>\n/sticker : Mengirimkan foto untuk dikonversi menjadi stiker\nsummarize : Untuk merangkum teks yang diberikan. Gunakan /summarize <teks>\n/donasi : Donasi Anda sangat membantu bagi saya!`;
        await chat.react('👋');
        await chat.sendMessage(menuReply);
        break;

      case '/donasi':
        const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
        await chat.react('❤️');
        await chat.sendMessage(donationReply);
        break;

      default:
        if (msg.body.startsWith('/summarize ')) {
          await handleSummarizeCommand(msg, chat);
        } else if (msg.hasMedia && msg.body.startsWith('/sticker')) {
          await handleStickerCommand(msg, chat);
        } else if (chat.isGroup && msg.body.startsWith('/ask ')) {
          await handleGroupQuestion(msg, chat);
        } else if (!chat.isGroup && !msg.body.startsWith('/ask ')) {
          await handlePersonalChat(msg, chat);
        }
    }
  } catch (error) {
    await chat.react('❌');
    console.error('Error handling message:', error);
  }
});

async function handleSummarizeCommand(msg, chat) {
  const text = msg.body.slice('/summarize '.length);
  const summary = await summarizeText(text);
  await chat.react('📝');
  await chat.sendMessage(summary);
}

async function handleStickerCommand(msg, chat) {
  await chat.react('👌');
  await msg.reply('Foto sedang diproses...');
  const media = await msg.downloadMedia();
  await chat.sendMessage(media, {
    sendMediaAsSticker: true,
    stickerName: 'RoboGPT',
    stickerAuthor: 'StickerPack by RoboGPT',
  });
}

async function handleGroupQuestion(msg, chat) {
  const question = msg.body.slice(questionOffset);
  const reply = await generateResponse(question);
  await chat.react('✅');
  await chat.sendMessage(reply);
}

async function handlePersonalChat(msg, chat) {
  const history = await chat.fetchMessages({ limit: historyLimit });
  const formattedHistory = formatChatHistory(history, msg.fromMe);
  console.log(formattedHistory);
  const reply = await generateResponse(formattedHistory);
  await chat.sendMessage(reply);
}

function formatChatHistory(history, fromMe) {
  const introduction = `You are Robo, a 500-year-old teenager from NEC (Nusantara Electronic City), an advanced city that exists in the future. You are an experienced programmer who can solve problems and provide solutions and codes. You are very fond of math. You are also good at managing finances and investments including stock investments, long-term investments, and other investments. As an AI assistant, you have a strong curiosity to learn and grow.\n`;

  const formattedHistory = history
    .map((msg) => {
      const sender = msg.fromMe ? 'Robo' : msg.author || 'Friend';
      return `${sender}: ${msg.body}`;
    })
    .join('\n');

  return introduction + formattedHistory;
}
