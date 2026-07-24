const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR } = require('../../config');

const silentGuilds = new Set();

module.exports = {
  name: 'addSong',
  silentGuilds,
  async execute(queue, song) {
    console.log(`[addSong] "${song.name}" | Cola: ${queue.songs.length} canciones`);

    if (silentGuilds.has(queue.id)) {
      return;
    }

    if (queue.songs.length <= 1) return;

    const interaction = queue.metadata?.interaction;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('📥 Añadido a la cola')
      .setDescription(`[${song.name}](${song.url})`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: '👤 Autor', value: song.uploader?.name || 'Desconocido', inline: true },
        { name: '⏱️ Duración', value: song.isLive ? '🔴 En vivo' : song.formattedDuration, inline: true },
        { name: '📊 Posición', value: `#${queue.songs.indexOf(song)} en la cola`, inline: true },
      );

    if (interaction) {
      await interaction.editReply({ embeds: [embed] }).catch(() => {});
    } else {
      await queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
    }

    if (queue.metadata?.interaction) {
      queue.metadata.interaction = null;
    }
  },
};
