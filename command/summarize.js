const { summarizeText } = require('../lib/simplied-gpt');

async function execute(msg, chat, args) {
  if (args.length < 2) {
    await Promise.all([msg.react('❌'), chat.sendMessage('Format perintah tidak valid. Harap gunakan "/summarize <value> <teks>, ketik /menu jika bingung".')]);
    return;
  }

  const maxTokens = parseInt(args[0]);
  if (![60, 150, 200].includes(maxTokens)) {
    await Promise.all([msg.react('❌'), chat.sendMessage('Nilai tidak valid untuk <value>. Silakan gunakan 60, 150, atau 200, ketik /menu jika bingung.')]);
    return;
  }

  const text = args.slice(1).join(' ');
  const summary = await summarizeText(maxTokens, text);
  await Promise.all([msg.react('📝'), chat.sendMessage(summary)]);
}

module.exports = {
  execute,
};
