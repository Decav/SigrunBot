const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMBED_COLOR } = require('../../config');

module.exports = {
  name: 'playSong',
  async execute(queue, song) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prev_${queue.id}`).setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`toggle_${queue.id}`).setEmoji('⏯️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`skip_${queue.id}`).setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`voldown_${queue.id}`).setEmoji('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`volup_${queue.id}`).setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🎶 Reproduciendo ahora')
      .setDescription(`[${song.name}](${song.url})`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: '👤 Subido por', value: song.uploader?.name || 'Desconocido', inline: true },
        { name: '⏱️ Duración', value: song.isLive ? '🔴 En vivo' : song.formattedDuration, inline: true },
        { name: '🎚️ Volumen', value: `${queue.volume}%`, inline: true },
      );

    const oldMsg = module.exports.messages.get(queue.id);
    if (oldMsg) {
      module.exports.messages.delete(queue.id);
      oldMsg.delete().catch(() => {});
    }

    const msg = await queue.textChannel?.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (msg) module.exports.messages.set(queue.id, msg);
  },
  messages: new Map(),
};
