const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reanuda la reproducción pausada'),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Debes estar en un canal de voz.',
        ephemeral: true,
      });
    }

    const queue = interaction.client.distube.getQueue(interaction.guild);
    if (!queue) {
      return interaction.reply({
        content: '❌ No hay canciones reproduciéndose.',
        ephemeral: true,
      });
    }

    const botVoice = interaction.guild.members.me.voice.channel;
    if (botVoice && voiceChannel.id !== botVoice.id) {
      return interaction.reply({
        content: '❌ Debes estar en el mismo canal de voz que el bot.',
        ephemeral: true,
      });
    }

    if (!queue.paused) {
      return interaction.reply({
        content: '▶️ La reproducción ya está en curso.',
        ephemeral: true,
      });
    }

    queue.resume();
    await interaction.reply('▶️ Reproducción reanudada.');
  },
};
