const {
  generateResponse,
  summarizeText,
  drawGpt,
  introduction,
  checkApiOpenai,
  checkBillingDetails,
} = require("../utils/openai.js");
const { handleVoice } = require("../utils/audioToText.js");
const { EditPhotoRequest } = require("../utils/removebg.js");

const dotenv = require("dotenv");
const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);
const menu = parseInt(process.env.MENU);

dotenv.config();

module.exports = {
  handleMessage: async (msg) => {
    try {
      let lowercaseMsg = msg.body.toLowerCase();
      console.log(`MESSAGE RECEIVED ${msg.body}`);
      const chat = await msg.getChat();
      const isPrivateChat = !chat.isGroup;
      const isGroup = chat.isGroup;
      const containsLink = /(http:\/\/|https:\/\/)\S+/i.test(msg.body);

      if (isGroup && containsLink) {
        console.log("Link message detected, ignoring...");
        return;
      }
      
      //   if (isGroup) {
      //     const contact = await msg.getContact();
      //     let num = contact.number;
      //     let isAdmin = false;

      //     for (let participant of chat.participants) {
      //       if (participant.id.user === num) {
      //         isAdmin = participant.isAdmin;
      //       }
      //     }

      //     console.log(JSON.stringify({ isAdmin }));
      //   }

      await chat.sendStateTyping();

      // menu
      if (lowercaseMsg === "/menu") {
        const menuReply = menu;
        await Promise.all([msg.react("👋"), chat.sendMessage(menuReply)]);
      }
      // donate
      else if (lowercaseMsg === "/donasi") {
        const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
        await Promise.all([msg.react("❤️"), chat.sendMessage(donationReply)]);
      }
      // summarize
      else if (lowercaseMsg.startsWith("/summarize ")) {
        const params = lowercaseMsg.slice("/summarize ".length).split(" ");
        if (params.length < 2) {
          await Promise.all([
            msg.react("❌"),
            chat.sendMessage(
              'Format perintah tidak valid. Harap gunakan "/summarize <value> <teks>, ketik /menu jika bingung".'
            ),
          ]);
          return;
        }
        const maxTokens = parseInt(params[0]);
        if (![60, 150, 200].includes(maxTokens)) {
          await Promise.all([
            msg.react("❌"),
            chat.sendMessage(
              "Nilai tidak valid untuk <value>. Silakan gunakan 60, 150, atau 200, ketik /menu jika bingung."
            ),
          ]);
          return;
        }
        const text = params.slice(1).join(" ");
        const summary = await summarizeText(maxTokens, text);
        await Promise.all([msg.react("📝"), chat.sendMessage(summary)]);
      }
      // sticker
      else if (msg.hasMedia && lowercaseMsg.startsWith("/sticker")) {
        await Promise.all([msg.react("👌"), msg.reply("Sedang diproses...")]);
        const media = await msg.downloadMedia();
        await chat.sendMessage(media, {
          sendMediaAsSticker: true,
          stickerName: "RoboGPT",
          stickerAuthor: "StickerPack by RoboGPT",
        });
      }
      // tagall
      else if (isGroup && lowercaseMsg === "/tagall") {
        // i can't fix 😵
        let text = "";
        let mentions = [];
        for (let participant of chat.participants) {
          const contact = await msg.client.getContactById(
            participant.id._serialized
          );
          mentions.push(contact);
          text += `@${participant.id.user} `;
        }
        await Promise.all([
          msg.react("👥"),
          chat.sendMessage(text, {
            mentions,
          }),
        ]);
        await msg.delete(true);
      }
      // ping
      else if (lowercaseMsg === "/ping") {
        const startTime = Date.now();
        const serverTime = new Date().toLocaleString();
        console.log(
          `[!] Pinged\nS: ${msg.timestamp}\nR: ${startTime}\nServer Time: ${serverTime}`
        );
        const response = await msg.reply("Pinging...");
        const endTime = Date.now();
        console.log(`E: ${endTime}`);
        const chat = await response.getChat();
        await chat.sendMessage(
          `🏓 Pong! ${
            (endTime - startTime) / 1000
          }s\n⌚ Server Time: ${serverTime}`
        );
      }
      // check openai billing account
      else if (!isGroup && lowercaseMsg === "/ckey") {
        const apiData = await checkApiOpenai();
        await chat.sendMessage(apiData);
      } else if (!isGroup && lowercaseMsg === "/ubill") {
        const responseMessage = "*Berikut adalah rincian penggunaan apikey:*";
        const billingDetails = await checkBillingDetails(responseMessage);
        await chat.sendMessage(billingDetails);
      }
      // draw
      else if (lowercaseMsg.startsWith("/draw ")) {
        const text = lowercaseMsg.slice("/draw ".length);
        const media = await drawGpt(text);
        const reply = await MessageMedia.fromUrl(media);
        await Promise.all([
          msg.react("✅"),
          chat.sendMessage(reply, {
            caption: `${text}`,
          }),
        ]);
      }
      // change foto background (removebg api)
      else if (lowercaseMsg.startsWith("/bg ")) {
        const text = lowercaseMsg.slice("/bg ".length);
        if (msg.hasMedia) {
          if (msg.type != "image") {
            return await Promise.all([
              msg.react("❌"),
              msg.reply("hanya bisa edit dengan format image."),
            ]);
          }
          const media = await msg.downloadMedia();
          if (media) {
            const newPhoto = await EditPhotoRequest(media.data, text);
            if (!newPhoto.success) {
              return await Promise.all([
                msg.react("❌"),
                msg.reply("Terjadi kesalahan."),
              ]);
            }
            media.data = newPhoto.base64;
            await Promise.all([
              msg.react("✅"),
              chat.sendMessage(media, {
                caption: `Ini hasilnya background telah diubah ke warna ${text}`,
              }),
            ]);
          }
        }
      }
      // group ask
      else if (isGroup && lowercaseMsg.startsWith("/ask ")) {
        const question = lowercaseMsg.slice(questionOffset);
        const reply = await generateResponse(question);
        await Promise.all([msg.react("✅"), chat.sendMessage(reply)]);
      }
      // mute
      else if (isGroup && lowercaseMsg === "/mute") {
        await chat.setMessagesAdminsOnly();
        return;
      }
      // unmute
      else if (isGroup && lowercaseMsg === "/unmute") {
        await chat.setMessagesAdminsOnly(false);
        return;
      }
      // handle /ask without a question in group chat
      else if (isGroup && lowercaseMsg === "/ask") {
        await Promise.all([
          msg.react("❌"),
          chat.sendMessage(
            'Anda harus menambahkan pertanyaan setelah "/ask". Contoh: "/ask Apa warna langit?"'
          ),
        ]);
      }
      // private chat
      else if (isPrivateChat && lowercaseMsg === "/gjoin") {
        const get = await msg.client.getGroups();
        const groupNames = get
          .filter((group) => group.name !== undefined)
          .map((group, index) => ({
            number: index + 1,
            name: group.groupMetadata.subject,
            unreadCount: group.unreadCount,
            isReadOnly: group.isReadOnly,
          }));
        
        let groupNamesText = "*List group bot join:*\n\n";
        groupNames.forEach((group) => {
          if (group.name !== undefined) {
            groupNamesText += `No. ${group.number}\n`;
            groupNamesText += `Nama: ${group.name}\n`;
            groupNamesText += `Hanya dapat dilihat: ${group.isReadOnly}\n`;
            groupNamesText += `Pesan belum dibaca: ${group.unreadCount}\n`;
            groupNamesText += `---------------------------\n`;
          }
        });

        await chat.sendMessage(groupNamesText);
        return;
    }
      else if (
        isPrivateChat &&
        (lowercaseMsg === "/ask" || lowercaseMsg.startsWith("/ask "))
      ) {
        await Promise.all([
          msg.react("❌"),
          chat.sendMessage("Command /ask hanya dapat digunakan dalam grup."),
        ]);
      } else if (isPrivateChat && lowercaseMsg === "/tagall") {
        await Promise.all([
          msg.react("❌"),
          chat.sendMessage("Command /tagall hanya dapat digunakan dalam grup."),
        ]);
        // handle voice messages
      } else if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        if (media.mimetype === "audio/ogg; codecs=opus") {
          const request = await handleVoice(media);
          const toGpt = await generateResponse(request);
          if (request === "NO TRANSCRIPTION") {
            await Promise.all([
              msg.react("❌"),
              chat.sendMessage(
                msg.from,
                "Saya tidak dapat memahami apa yang baru saja Anda katakan. Mohon coba lagi. Jika tetap tidak berhasil, silakan coba mengetik."
              ),
            ]);
            return;
          } else {
            return chat.sendMessage(toGpt);
          }
        }
      } else {
        if (!isGroup && process.env.OPENAI_API_KEY) {
          const history = await chat.fetchMessages({
            limit: historyLimit,
          });
          const formattedHistory = await introduction(history);
          const reply = await generateResponse(formattedHistory);
          await chat.sendMessage(reply);
        } else if (!process.env.OPENAI_API_KEY) {
          await chat.sendMessage(
            "Bep bep bep....., bot sedang error coba lagi nanti"
          );
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  },
};
