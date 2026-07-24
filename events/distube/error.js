const { EmbedBuilder } = require('discord.js');
const util = require('util');
const playSongModule = require('./playSong');

module.exports = {
  name: 'error',
  async execute(error, queue, song) {
    console.error('[DISTUBE ERROR] message:', error?.message);
    console.error('[DISTUBE ERROR] Tipo:', error?.constructor?.name);
    if (error?.stack) console.error('[DISTUBE ERROR STACK]', error.stack.split('\n').slice(0, 4).join('\n'));
    if (queue?.textChannel) console.error('[DISTUBE ERROR] Canal:', queue.textChannel.name);
    if (song) console.error('[DISTUBE ERROR] Canción:', song.name);

    if (queue && queue.songs.length === 0) {
      const oldMsg = playSongModule.messages.get(queue.id);
      playSongModule.messages.delete(queue.id);
      if (oldMsg) oldMsg.delete().catch(() => {});
    }

    const channel = queue?.textChannel;
    if (channel && typeof channel.send === 'function') {
      let description = error?.message?.slice(0, 1000) || 'Ocurrió un error inesperado al reproducir.';

      if (error?.message?.includes('No results')) {
        description = 'No se encontraron resultados para la búsqueda.';
      } else if (error?.message?.includes('Sign in to confirm')) {
        description = 'El video solicitado requiere verificación de edad.';
      } else if (error?.message?.includes('Private video')) {
        description = 'El video es privado y no puede ser reproducido.';
      } else if (error?.message?.includes('NO_STREAM_URL')) {
        description = 'No se pudo obtener el stream de audio del video.\nPuede estar bloqueado por región o ser contenido restringido.';
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error de reproducción')
        .setDescription(description.slice(0, 2000));

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
