async function execute(msg, chat) {
    const donationReply = `Berapapun donasinya akan saya terima!, terima kasih 😊\n\nOVO: 089650572376\nDANA: 089650572376`;
    await Promise.all([msg.react('❤️'), chat.sendMessage(donationReply)]);
  }
  
  module.exports = {
    execute,
  };  