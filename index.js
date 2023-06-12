const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { generateResponse, summarizeText, drawGpt, introduction } = require('./function.js');
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
    const isPrivateChat = !chat.isGroup;
    const { body } = msg;

    switch (body) {
      case '/menu': {
        const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup, robo support voice message jika anda malas ngetik cukup kirim voice message aja kepadanya!.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan /ask <pertanyaan>\n\n/tagall : Untuk mention semua pengguna yang ada didalam group\n\n/draw : Buat gambar yang anda inginkan hanya dengan kata-kata, layaknya sihir!, gunakan /draw <teks>\n\n/sticker : Kirimkan foto dengan /sticker untuk dikonversi menjadi stiker\n\n/summarize : Untuk merangkum teks, berita, laporan, dll. Gunakan /summarize <value> <teks>\nvalue setting : 60 = Pendek, 150 = Medium, 200 = Panjang\n\n/donasi : Donasi Anda sangat membantu bagi saya!`;
        await Promise.all([
          msg.react('👋'),
          chat.sendMessage(menuReply)
        ]);
        break;
      }
      case '/donasi': {
        const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
        await Promise.all([
          msg.react('❤️'),
          chat.sendMessage(donationReply)
        ]);
        break;
      }
      case '/ping': {
        const startTime = Date.now();
        const serverTime = new Date().toLocaleString();
        console.log(`[!] Pinged\nS: ${msg.timestamp}\nR: ${startTime}\nServer Time: ${serverTime}`);
        const response = await msg.reply("Pinging...");
        const endTime = Date.now();
        console.log(`E: ${endTime}`);
        const responseChat = await response.getChat();
        await responseChat.sendMessage(`🏓 Pong! ${(endTime - startTime) / 1000}s\n⌚ Server Time: ${serverTime}`);
        break;
      }
      case '/tagall': {
        if (chat.isGroup) {
          let text = "";
          let mentions = [];
          for (let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
            text += `@${participant.id.user} `;
          }
          await Promise.all([
            msg.react('👥'),
            chat.sendMessage(text, { mentions })
          ]);
          await msg.delete(true);
        } else {
          await Promise.all([
            msg.react('❌'),
            chat.sendMessage('Command /tagall hanya dapat digunakan dalam grup.')
          ]);
        }
        break;
      }
      default: {
        if (isPrivateChat) {
          await Promise.all([
            msg.react('❌'),
            chat.sendMessage('Command /ask hanya dapat digunakan dalam grup.')
          ]);
        } else if (msg.body.startsWith('/ask ')) {
          const question = msg.body.slice(questionOffset);
          const reply = await generateResponse(question);
          await Promise.all([
            msg.react('✅'),
            chat.sendMessage(reply)
          ]);
        } else if (msg.hasMedia) {
          const media = await msg.downloadMedia();
          if (media.mimetype === 'audio/ogg; codecs=opus') {
            const request = await handleVoice(media);
            const toGpt = await generateResponse(request);
            if (request === 'NO TRANSCRIPTION') {
              await Promise.all([
                msg.react('❌'),
                chat.sendMessage(msg.from, 'Saya tidak dapat memahami apa yang baru saja Anda katakan. Mohon coba lagi. Jika tetap tidak berhasil, silakan coba mengetik.')
              ]);
              return;
            } else {
              return await chat.sendMessage(toGpt);
            }
          }
        } else {
          const history = await chat.fetchMessages({ limit: historyLimit });
          const formattedHistory = await introduction(history);
          const reply = await generateResponse(formattedHistory);
          await chat.sendMessage(reply);
        }
        break;
      }
    }
  } catch (error) {
    await Promise.all([
      msg.react('❌'),
      console.error('Error handling message:', error)
    ]);
  }
});