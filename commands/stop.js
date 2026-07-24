const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la música, limpia la cola y desconecta al bot'),
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

    try {
      const distube = interaction.client.distube;
      await queue.stop();
      distube.voices.leave(interaction.guild);
      await interaction.reply('⏹️ Reproducción detenida. Cola limpiada y desconectando del canal.');
    } catch (error) {
      await interaction.reply({
        content: `❌ Error al detener: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
