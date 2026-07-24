const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta a la siguiente canción en la cola'),
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

    if (queue.songs.length <= 1 && !queue.autoplay) {
      await interaction.reply({
        content: '❌ No hay más canciones en la cola.',
        ephemeral: true,
      });
      return;
    }

    try {
      const song = await queue.skip();
      await interaction.reply(`⏭️ Saltada. Reproduciendo ahora: **${song.name}**`);
    } catch (error) {
      await interaction.reply({
        content: `❌ Error al saltar: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
