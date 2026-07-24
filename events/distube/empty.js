const playSongModule = require('./playSong');

module.exports = {
  name: 'empty',
  async execute(queue) {
    const oldMsg = playSongModule.messages.get(queue.id);
    playSongModule.messages.delete(queue.id);
    if (oldMsg) oldMsg.delete().catch(() => {});
    try {
      await queue.textChannel?.send('👋 El canal de voz está vacío. Desconectando...');
    } catch {
      // Ignore if can't send message
    }
    setTimeout(() => {
      try {
        queue.voice?.leave();
      } catch {
        // Ignore disconnection errors
      }
    }, 5000);
  },
};
