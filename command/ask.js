const { generateResponse } = require('../lib/simplied-gpt');

async function execute(msg, chat, args) {
  const question = args.join(' ');
  const reply = await generateResponse(question);
  await chat.sendMessage(reply);
}

module.exports = {
  execute,
};