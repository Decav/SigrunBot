const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR } = require('../../config');
const playSongModule = require('./playSong');

module.exports = {
  name: 'finish',
  async execute(queue) {
    const oldMsg = playSongModule.messages.get(queue.id);
    playSongModule.messages.delete(queue.id);
    if (oldMsg) oldMsg.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('👋 Cola finalizada')
      .setDescription('Todas las canciones han terminado. ¡Hasta la próxima!');

    await queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
    queue.voice?.leave();
  },
};
