const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR } = require('../../config');

module.exports = {
  name: 'addList',
  async execute(queue, playlist) {
    console.log(`[addList] "${playlist.name}" | ${playlist.songs.length} canciones | Cola: ${queue.songs.length}`);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('📋 Playlist añadida')
      .setDescription(`[${playlist.name}](${playlist.url || '#'})`)
      .setThumbnail(playlist.thumbnail)
      .addFields(
        { name: '🎵 Canciones', value: `${playlist.songs.length}`, inline: true },
        { name: '⏱️ Duración total', value: playlist.formattedDuration || 'N/A', inline: true },
        { name: '📊 En cola', value: `${queue.songs.length} canciones totales`, inline: true },
      );

    if (playlist.songs.length > 0) {
      const preview = playlist.songs
        .slice(0, 5)
        .map((s, i) => `**${i + 1}.** ${s.name}`)
        .join('\n');
      embed.addFields({
        name: `📜 Primeras ${Math.min(5, playlist.songs.length)} canciones`,
        value: preview.slice(0, 1024),
      });
    }

    await queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  },
};
