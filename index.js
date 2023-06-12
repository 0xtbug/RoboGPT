const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { generateResponse, summarizeText, drawGpt } = require('./function.js');
const { handleVoice } = require('./utils/audioToText.js');

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
      const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup, robo support voice message jika anda malas ngetik cukup kirim voice message aja kepadanya!.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan /ask <pertanyaan>\n\n/tagall : Untuk mention semua pengguna yang ada didalam group\n\n/draw : Buat gambar yang anda inginkan hanya dengan kata-kata, layaknya sihir!, gunakan /draw <teks>\n\n/sticker : Kirimkan foto dengan /sticker untuk dikonversi menjadi stiker\n\n/summarize : Untuk merangkum teks, berita, laporan, dll. Gunakan /summarize <value> <teks>\nvalue setting : 60 = Pendek, 150 = Medium, 200 = Panjang\n\n/donasi : Donasi Anda sangat membantu bagi saya!`;
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
      await Promise.all([msg.react('👌'), msg.reply('Sedang diproses...')]);
      const media = await msg.downloadMedia();
      await chat.sendMessage(media, {
        sendMediaAsSticker: true,
        stickerName: 'RoboGPT',
        stickerAuthor: 'StickerPack by RoboGPT',
      });
     }  
     //   tagall
     else if (chat.isGroup && msg.body === '/tagall') {
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
        await msg.delete(true);
    } 
    // ping
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
    // draw
      else if (msg.body.startsWith('/draw ')) {
        const text = msg.body.slice('/draw '.length);
        const media = await drawGpt(text);
        const reply = await MessageMedia.fromUrl(media);
        await Promise.all([msg.react('✅'), chat.sendMessage(reply, {caption: "your image"})]);
      } 
    // group ask
    else if (chat.isGroup && msg.body.startsWith('/ask ')) {
        const question = msg.body.slice(questionOffset);
        const reply = await generateResponse(question);
        await Promise.all([msg.react('✅'), chat.sendMessage(reply)]);
      } 
      // handle voice messages
    else if (msg.hasMedia) {
      const media = await msg.downloadMedia();
        if (media.mimetype === 'audio/ogg; codecs=opus') {
          const request = await handleVoice(media);
          const toGpt = await generateResponse(request);
          if (request === 'NO TRANSCRIPTION') {
              client.sendMessage(msg.from, 'Saya tidak dapat memahami apa yang baru saja Anda katakan. Mohon coba lagi. Jika tetap tidak berhasil, silakan coba mengetik.')
              return
          } else {
              return chat.sendMessage(toGpt);
          }
        }
      }
    // handle /ask without a question in group chat
    else if (chat.isGroup && msg.body === '/ask') {
        await Promise.all([msg.react('❌'), chat.sendMessage('Anda harus menambahkan pertanyaan setelah "/ask". Contoh: "/ask Apa warna langit?"')]);
    }
    // private chat
    else if (isPrivateChat && (msg.body === '/ask' || msg.body.startsWith('/ask '))) {
        await Promise.all([msg.react('❌'), chat.sendMessage('Command /ask hanya dapat digunakan dalam grup.')]);
    } 
    else if (isPrivateChat && msg.body === '/tagall') {
        await Promise.all([msg.react('❌'), chat.sendMessage('Command /tagall hanya dapat digunakan dalam grup.')]);
    }else {
        // Fetch chat history
        const historyLimit = process.env.HISTORY_LIMIT;
        const history = await chat.fetchMessages({ limit: historyLimit });
        const reply = await generateResponse(history);
        await chat.sendMessage(reply);
      }
    } catch (error) {
      await Promise.all([msg.react('❌'), console.error('Error handling message:', error)]);
    }
  });  