const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { generateResponse, summarizeText } = require('./simplied-gpt.js');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
const dotenv = require('dotenv');

dotenv.config();

const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);

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

client.initialize();

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
    const chat = await msg.getChat();
    // Check if the message is in a private chat
    const isPrivateChat = !chat.isGroup;
    // menu
    if (msg.body === '/menu') {
      const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan /ask <pertanyaan>\n\n/tagall : Untuk mention semua pengguna yang ada didalam group\n\n/sticker : Kirimkan foto dengan /sticker untuk dikonversi menjadi stiker\n\n/summarize : Untuk merangkum teks, berita, laporan, dll. Gunakan /summarize <value> <teks>\nvalue setting : 60 = Pendek, 150 = Medium, 200 = Panjang\n\n/donasi : Donasi Anda sangat membantu bagi saya!`;
      await Promise.all([msg.react('👋'), chat.sendMessage(menuReply)]);
    } 
    //   donate
    else if (msg.body === '/donasi') {
      const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
      await Promise.all([msg.react('❤️'), chat.sendMessage(donationReply)]);
    } 
    //   summarize
    else if (msg.body.startsWith('/summarize ')) {
      const params = msg.body.slice('/summarize '.length).split(' ');
      if (params.length < 2) {
        await Promise.all([msg.react('❌'), chat.sendMessage('Format perintah tidak valid. Harap gunakan "/summarize <value> <teks>, ketik /menu jika bingung".')]);
        return;
      }
      const maxTokens = parseInt(params[0]);
      if (![60, 150, 200].includes(maxTokens)) {
        await Promise.all([msg.react('❌'), chat.sendMessage('Nilai tidak valid untuk <value>. Silakan gunakan 60, 150, atau 200, ketik /menu jika bingung.')]);
        return;
      }
      const text = params.slice(1).join(' ');
      const summary = await summarizeText(maxTokens, text);
      await Promise.all([msg.react('📝'), chat.sendMessage(summary)]);
    } 
    //   sticker
    else if (msg.hasMedia && msg.body.startsWith('/sticker')) {
      await Promise.all([msg.react('👌'), msg.reply('Foto sedang diproses...')]);
      const media = await msg.downloadMedia();
      await chat.sendMessage(media, {
        sendMediaAsSticker: true,
        stickerName: 'RoboGPT',
        stickerAuthor: 'StickerPack by RoboGPT',
      });
     }  
     //   tagall
     else if (chat.isGroup && msg.body === '/tagall') {
        if (isPrivateChat) {
            await Promise.all([msg.react('❌'), chat.sendMessage('Command /tagall hanya dapat digunakan dalam grup.')]);
            return;
        }
        // i can't fix 😵
        // const sender = await client.getParticipant(msg.author);
        // if (!sender.isAdmin) {
        //   await Promise.all([msg.react('❌'), chat.sendMessage('You must be an admin to use this command.')]);
        //   return;
        // }
        let text = "";
        let mentions = [];
        for (let participant of chat.participants) {
          const contact = await client.getContactById(participant.id._serialized);
          mentions.push(contact);
          text += `@${participant.id.user} `;
        }
        await Promise.all([msg.react('👥'), chat.sendMessage(text, { mentions })]);
    } 
    else if (msg.body === '/ping') {
        const startTime = Date.now();
        const serverTime = new Date().toLocaleString();
        console.log(`[!] Pinged\nS: ${msg.timestamp}\nR: ${startTime}\nServer Time: ${serverTime}`);
        const response = await msg.reply("Pinging...");
        const endTime = Date.now();
        console.log(`E: ${endTime}`);
        const chat = await response.getChat();
        await chat.sendMessage(`🏓 Pong! ${(endTime - startTime) / 1000}s\n⌚ Server Time: ${serverTime}`);
      }
    // group
    else if (chat.isGroup && msg.body.startsWith('/ask ')) {
      const question = msg.body.slice(questionOffset);
      const reply = await generateResponse(question);
      await Promise.all([msg.react('✅'), chat.sendMessage(reply)]);
    } 
    // private chat
    else if (isPrivateChat) {
        if (msg.body === '/ask' || msg.body.startsWith('/ask ')) {
            await Promise.all([msg.react('❌'), chat.sendMessage('Command /ask hanya dapat digunakan dalam grup.')]);
            return;   
        }
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