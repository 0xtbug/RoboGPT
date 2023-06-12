async function execute(msg) {
    const startTime = Date.now();
    const serverTime = new Date().toLocaleString();
    console.log(`[!] Pinged\nS: ${msg.timestamp}\nR: ${startTime}\nServer Time: ${serverTime}`);
    const response = await msg.reply("Pinging...");
    const endTime = Date.now();
    console.log(`E: ${endTime}`);
    const chat = await msg.getChat();
    const diff = endTime - startTime;
    await response.edit(`🏓 Pong!\nLatency: ${diff}ms`);
  }
  
  module.exports = {
    execute,
  };
  