async function execute(msg, chat) {
    await Promise.all([msg.react('👌'), msg.reply('Foto sedang diproses...')]);
    const media = await msg.downloadMedia();
    await chat.sendMessage(media, {
      sendMediaAsSticker: true,
      stickerName: 'RoboGPT',
      stickerAuthor: 'StickerPack by RoboGPT',
    });
  }
  
  module.exports = {
    execute,
  };  