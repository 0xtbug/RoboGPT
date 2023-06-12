async function execute(msg, chat) {
    const menuReply = `Hai, saya adalah Robo Assisten pribadi Anda. Senang bisa bertemu dengan Anda 😊\n\nRobo dapat digunakan dalam percakapan pribadi maupun dalam grup.\n\nBerikut beberapa penjelasan fitur yang bisa Anda coba:\n\n/ask : Untuk bertanya dalam grup, gunakan /ask <pertanyaan>\n\n/tagall : Untuk mention semua pengguna yang ada didalam group\n\n/sticker : Kirimkan foto dengan /sticker untuk dikonversi menjadi stiker\n\n/summarize : Untuk merangkum teks, berita, laporan, dll. Gunakan /summarize <value> <teks>\nvalue setting : 60 = Pendek, 150 = Medium, 200 = Panjang\n\n/donasi : Donasi Anda sangat membantu bagi saya!`;
    await Promise.all([msg.react('👋'), chat.sendMessage(menuReply)]);
  }
  
  module.exports = {
    execute,
  };
  