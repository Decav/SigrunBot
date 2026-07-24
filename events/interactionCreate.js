const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMBED_COLOR } = require('../config');
const playSongModule = require('./distube/playSong');

async function handleButton(interaction) {
  const customId = interaction.customId;
  const guildId = interaction.guildId;

  const queue = interaction.client.distube.getQueue(guildId);
  if (!queue) {
    return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });
  }

  const voiceChannel = interaction.member.voice.channel;
  const botVoice = interaction.guild.members.me.voice.channel;
  if (!voiceChannel || (botVoice && voiceChannel.id !== botVoice.id)) {
    return interaction.reply({ content: '❌ Debes estar en el mismo canal de voz.', ephemeral: true });
  }

  const msg = playSongModule.messages.get(guildId);

  if (customId.startsWith('prev_')) {
    try {
      await queue.previous();
    } catch {
      // No previous song
    }
    await interaction.deferUpdate().catch(() => {});
    return;
  }

  if (customId.startsWith('toggle_')) {
    if (queue.paused) {
      queue.resume();
    } else {
      queue.pause();
    }

    if (msg) {
      const song = queue.songs[0];
      const row = buildRow(queue);
      const embed = buildEmbed(queue, song);
      await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
    }
    await interaction.deferUpdate().catch(() => {});
    return;
  }

  if (customId.startsWith('skip_')) {
    if (queue.songs.length <= 1) {
      return interaction.reply({ content: '❌ No hay más canciones en la cola.', ephemeral: true });
    }
    try {
      await queue.skip();
    } catch {
      // Skip failed
    }
    await interaction.deferUpdate().catch(() => {});
    return;
  }

  if (customId.startsWith('voldown_') || customId.startsWith('volup_')) {
    const delta = customId.startsWith('voldown_') ? -10 : 10;
    queue.volume = Math.max(0, Math.min(100, queue.volume + delta));

    if (msg) {
      const song = queue.songs[0];
      const row = buildRow(queue);
      const embed = buildEmbed(queue, song);
      await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
    }
    await interaction.deferUpdate().catch(() => {});
    return;
  }
}

function buildRow(queue) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`prev_${queue.id}`).setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`toggle_${queue.id}`).setEmoji(queue.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`skip_${queue.id}`).setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`voldown_${queue.id}`).setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`volup_${queue.id}`).setEmoji('🔊').setStyle(ButtonStyle.Secondary),
  );
}

function buildEmbed(queue, song) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('🎶 Reproduciendo ahora')
    .setDescription(`[${song.name}](${song.url})`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: '👤 Subido por', value: song.uploader?.name || 'Desconocido', inline: true },
      { name: '⏱️ Duración', value: song.isLive ? '🔴 En vivo' : song.formattedDuration, inline: true },
      { name: '🎚️ Volumen', value: `${queue.volume}%`, inline: true },
    );
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (error) {
        console.error('[BUTTON ERROR]', error.message);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Error al procesar el botón.', ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error('Error en autocomplete:', error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[CMD ERROR] /${interaction.commandName} | Usuario: ${interaction.user?.tag} | Servidor: ${interaction.guild?.name}`);
      console.error('[CMD ERROR]', error.message);
      console.error('[CMD ERROR STACK]', (error.stack || '').split('\n').slice(0, 4).join('\n'));
      const reply = {
        content: '❌ Ocurrió un error inesperado al ejecutar este comando.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  },
};
