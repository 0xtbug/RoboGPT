async function execute(msg, chat, args, client) {
    let text = "";
    let mentions = [];
    for (let participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);
      mentions.push(contact);
      text += `@${participant.id.user} `;
    }
    await Promise.all([msg.react('👥'), chat.sendMessage(text, { mentions })]);
  }
  
  module.exports = {
    execute,
  };
  