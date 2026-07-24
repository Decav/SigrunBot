const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { EMBED_COLOR } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la lista de canciones en cola')
    .addIntegerOption((option) =>
      option
        .setName('página')
        .setDescription('Número de página')
        .setMinValue(1),
    ),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guild);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({
        content: '❌ No hay canciones en la cola.',
        ephemeral: true,
      });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.songs.length / itemsPerPage);
    let page = interaction.options.getInteger('página') || 1;

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const songs = queue.songs.slice(start, end);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(`📋 Cola — ${interaction.guild.name}`)
      .setDescription(
        `🎶 **Reproduciendo ahora:** [${queue.songs[0].name}](${queue.songs[0].url})\n` +
        `📊 **Total:** ${queue.songs.length} canciones | **Página:** ${page}/${totalPages}\n` +
        `${queue.paused ? '⏸️ **Pausado**' : '▶️ **Reproduciendo**'} | 🔂 **Loop:** ${queue.repeatMode === 0 ? 'Apagado' : queue.repeatMode === 1 ? 'Canción' : 'Cola'}`,
      );

    if (page === 1 && songs.length > 1) {
      const firstPage = songs.slice(1);
      const queueList = firstPage
        .map((s, i) => `**${i + 1}.** [${s.name}](${s.url}) — \`${s.formattedDuration}\``)
        .join('\n');

      if (queueList) {
        embed.addFields({ name: '📜 Próximas canciones', value: queueList.slice(0, 1024) });
      }
    } else if (page > 1) {
      const queueList = songs
        .map((s, i) => `**${start + i}.** [${s.name}](${s.url}) — \`${s.formattedDuration}\``)
        .join('\n');

      if (queueList) {
        embed.addFields({ name: '📜 Canciones en cola', value: queueList.slice(0, 1024) });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
