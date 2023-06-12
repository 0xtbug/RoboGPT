const { generateResponse, summarizeText } = require('./simplied-gpt');

const historyLimit = parseInt(process.env.HISTORY_LIMIT);
const questionOffset = parseInt(process.env.QUESTION_OFFSET);

const commands = {
  menu: require('../commands/menu'),
  donasi: require('../commands/donasi'),
  summarize: require('../commands/summarize'),
  sticker: require('../commands/sticker'),
  tagall: require('../commands/tagall'),
  ping: require('../commands/ping'),
  ask: require('../commands/ask'),
};

async function handleIncomingMessage(msg, client) {
  const chat = await msg.getChat();
  const isPrivateChat = !chat.isGroup;

  // Parse command and arguments
  const [command, ...args] = msg.body.split(' ');

  // Execute command if available
  if (commands.hasOwnProperty(command)) {
    await commands[command].execute(msg, chat, args, client);
  } else {
    // Default response when no specific command is matched
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
}

module.exports = {
  handleIncomingMessage,
};
