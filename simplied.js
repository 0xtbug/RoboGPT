const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { generateResponse, summarizeText, transcribeVoiceMessage } = require('./simplied-gpt.js');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
const dotenv = require('dotenv');

dotenv.config();

const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);

const client = new Client({
    authStrategy: new LocalAuth({
      clientId: "client",
      dataPath: "./sessions",
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
      },
      authTimeoutMs: 0,
      qrMaxRetries: 0,
      takeoverOnConflict: false,
      takeoverTimeoutMs: 0,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
      ffmpegPath: 'ffmpeg',
      bypassCSP: false,
      proxyAuthentication: undefined
  });

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
    if (msg.hasMedia && msg.type === 'audio') {
        await Promise.all([msg.react('🎙️'), msg.reply('Transcribing audio...')]);
        const media = await msg.downloadMedia();
        const filePath = `./audio/${msg.id}.${msg.mimetype.split('/')[1]}`;
        fs.writeFileSync(filePath, media);
        const transcription = await transcribeVoiceMessage(filePath);
        await chat.sendMessage(transcription);
    }else if (msg.body === '/menu') {
      const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan parameter /ask <pertanyaan>\n/sticker : Mengirimkan foto untuk dikonversi menjadi stiker\n/summarize : Untuk merangkum teks yang diberikan. Gunakan /summarize <teks>\n/donasi : Donasi Anda sangat membantu bagi saya!`;
      await Promise.all([msg.react('👋'), chat.sendMessage(menuReply)]);
    } else if (msg.body === '/donasi') {
      const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
      await Promise.all([msg.react('❤️'), chat.sendMessage(donationReply)]);
    } else if (msg.body.startsWith('/summarize ')) {
      const text = msg.body.slice('/summarize '.length);
      const summary = await summarizeText(text);
      await Promise.all([msg.react('📝'), chat.sendMessage(summary)]);
    } else if (msg.hasMedia && msg.body.startsWith('/sticker')) {
      await Promise.all([msg.react('👌'), msg.reply('Foto sedang diproses...')]);
      const media = await msg.downloadMedia();
      await chat.sendMessage(media, {
        sendMediaAsSticker: true,
        stickerName: 'RoboGPT',
        stickerAuthor: 'StickerPack by RoboGPT',
      });
    } else if (chat.isGroup && msg.body.startsWith('/ask ')) {
      const question = msg.body.slice(questionOffset);
      const reply = await generateResponse(question);
      await Promise.all([msg.react('✅'), chat.sendMessage(reply)]);
    } else if (!chat.isGroup && !msg.body.startsWith('/ask ')) {
      const history = await chat.fetchMessages({ limit: historyLimit });
      const introduction = `You are Robo, a 500-year-old teenager from NEC (Nusantara Electronic City), an advanced city that exists in the future. You are an experienced programmer who can solve problems and provide solutions and codes. You are very fond of math. You are also good at managing finances and investments including stock investments, long-term investments, and other investments. As an AI assistant, you have a strong curiosity to learn and grow.\n`;
      let formattedHistory = introduction;
      for (const msg of history) {
        const sender = msg.fromMe ? '' : msg.author || 'Friend';
        formattedHistory += `${msg.body}\n`; //${sender}: 
      }
      const reply = await generateResponse(formattedHistory);
      await chat.sendMessage(reply);
    }
  } catch (error) {
    await Promise.all([msg.react('❌'), console.error('Error handling message:', error)]);
  }
});