const { SlashCommandBuilder } = require('discord.js');
const { json } = require('@distube/yt-dlp');
const { execFileSync } = require('child_process');
const path = require('path');
const { silentGuilds } = require('../events/distube/addSong');

const YTDLP_PATH = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.exe');
const URL_REGEX = /^https?:\/\//i;
const SPOTIFY_REGEX = /open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/;
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
const RADIO_MIX_REGEX = /[&?]list=RD/;
const DEBUG = true;

function log(step, data) {
  if (!DEBUG) return;
  const str = data === undefined ? '' : (typeof data === 'string' ? data : JSON.stringify(data).slice(0, 200));
  console.log(`[PLAY] ${step}`, str);
}

async function resolveSpotify(url) {
  log('Resolviendo Spotify...', url);
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(oembedUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Spotify oEmbed responded with ${response.status}`);
    }

    const data = await response.json();
    clearTimeout(timeout);

    const title = data.title || '';
    log('Spotify info', `${title} — ${data.author_name || ''}`);
    return `${data.author_name || ''} ${title}`.trim();
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`No se pudo obtener información de Spotify: ${err.message}`);
  }
}

async function searchYoutube(query) {
  log('Buscando en YouTube...', query);
  const result = await json(`ytsearch:${query}`, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    preferFreeFormats: true,
    skipDownload: true,
    simulate: true,
  });

  let entry = result;
  if (result._type === 'playlist' && result.entries?.length > 0) {
    entry = result.entries[0];
  }

  const videoUrl = entry?.webpage_url || (entry?.id ? `https://www.youtube.com/watch?v=${entry.id}` : null);
  if (!videoUrl) throw new Error('No se encontraron resultados en YouTube.');

  log('Resultado YouTube', `${entry.title || query} — ${videoUrl}`);
  return videoUrl;
}

async function resolveRadioMix(url) {
  log('Resolviendo Radio Mix...');
  const output = execFileSync(YTDLP_PATH, [
    '--flat-playlist', '--playlist-end', '25',
    '--dump-json', '--skip-download', '--no-warnings',
    url,
  ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8' });

  const entries = output.trim().split('\n').filter(Boolean).map(JSON.parse);
  const urls = entries.map((e) => {
    return e.url || `https://www.youtube.com/watch?v=${e.id}`;
  });

  log('Radio Mix resuelto', `${urls.length} canciones encontradas`);
  return urls;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción de YouTube o Spotify')
    .addStringOption((option) =>
      option
        .setName('canción')
        .setDescription('Enlace o nombre de la canción')
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    if (!focused || focused.length < 2 || focused.length > 100 || URL_REGEX.test(focused)) {
      return interaction.respond([]).catch(() => {});
    }

    try {
      const result = await Promise.race([
        json(`ytsearch5:${focused}`, {
          dumpSingleJson: false,
          noWarnings: true,
          noCallHome: true,
          skipDownload: true,
          simulate: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
      ]);

      const entries = result?.entries || (result ? [result] : []);
      const choices = entries.slice(0, 5).map((e) => ({
        name: `${e.title || focused}`.slice(0, 100),
        value: e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`,
      }));

      await interaction.respond(choices).catch(() => {});
    } catch {
      // Silently ignore timeout or search failures
    }
  },
  async execute(interaction) {
    log('Usuario', interaction.user.tag);
    log('Guild', interaction.guild?.name);

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Debes estar en un canal de voz para reproducir música.',
        ephemeral: true,
      });
    }
    log('Canal de voz', voiceChannel.name);

    const botVoice = interaction.guild.members.me.voice.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      return interaction.reply({
        content: '❌ Ya estoy reproduciendo en otro canal de voz.',
        ephemeral: true,
      });
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.reply({
        content: '❌ Necesito permisos para conectarme y hablar en ese canal.',
        ephemeral: true,
      });
    }

    const rawQuery = interaction.options.getString('canción');
    log('Query original', rawQuery);

    await interaction.deferReply();
    log('Reply diferido enviado');

    let finalQuery = rawQuery;

    try {
      const spotifyMatch = rawQuery.match(SPOTIFY_REGEX);
      const isYoutube = YOUTUBE_REGEX.test(rawQuery);
      log('Tipo detectado', spotifyMatch ? `Spotify (${spotifyMatch[1]})` : isYoutube ? 'YouTube' : URL_REGEX.test(rawQuery) ? 'URL externa' : 'Texto');

      if (spotifyMatch) {
        log('Detectado enlace Spotify');
        const searchQuery = await resolveSpotify(rawQuery);
        finalQuery = await searchYoutube(searchQuery);
      } else if (isYoutube && RADIO_MIX_REGEX.test(rawQuery)) {
        log('Detectado Radio Mix de YouTube');
        const mixUrls = await resolveRadioMix(rawQuery);
        if (mixUrls.length === 0) {
          return interaction.editReply('❌ No se pudieron obtener canciones del mix.');
        }

        finalQuery = mixUrls[0];
        log('Reproduciendo primer video del mix');
        await interaction.client.distube.play(voiceChannel, finalQuery, {
          member: interaction.member,
          textChannel: interaction.channel,
          metadata: { interaction },
        });

        if (mixUrls.length > 1) {
          silentGuilds.add(interaction.guild.id);
          const total = mixUrls.length - 1;
          log(`Añadiendo ${total} canciones del mix...`);

          for (let i = 1; i < mixUrls.length; i++) {
            if (i % 5 === 0 && interaction.deferred) {
              await interaction.editReply({ content: `🎵 Añadiendo mix: ${i}/${total}...` }).catch(() => {});
            }
            await interaction.client.distube.play(voiceChannel, mixUrls[i], {
              member: interaction.member,
              textChannel: interaction.channel,
            });
          }

          silentGuilds.delete(interaction.guild.id);
          log(`${total} canciones del mix añadidas en silencio`);
        }

        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ content: `✅ Mix añadido (${mixUrls.length} canciones).` }).catch(() => {});
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
        }
        return;
      } else if (isYoutube) {
        log('Enlace YouTube, pasando directo');
      } else if (!isYoutube && URL_REGEX.test(rawQuery)) {
        log('Enlace no-YT/no-Spotify, pasando directo');
      } else if (!URL_REGEX.test(rawQuery)) {
        log('Texto libre, buscando');
        finalQuery = await searchYoutube(rawQuery);
      } else {
        log('Enlace YouTube, pasando directo');
      }

      log('Llamando distube.play con', finalQuery);
      const hasQueue = interaction.client.distube.getQueue(interaction.guild);
      await interaction.client.distube.play(voiceChannel, finalQuery, {
        member: interaction.member,
        textChannel: interaction.channel,
        metadata: { interaction },
      });
      log('distube.play completado');

      if (!hasQueue && interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: '🔍 Buscando...' }).catch(() => {});
        setTimeout(() => interaction.deleteReply().catch(() => {}), 1500);
      }
    } catch (error) {
      log('ERROR', error.message);
      log('ERROR stack', (error.stack || '').split('\n').slice(0, 3).join('\n'));

      const errMsg = error.message?.includes('No results') || error.message?.includes('NO_RESULT')
        ? 'No se encontraron resultados para tu búsqueda.'
        : error.message?.length < 500
          ? `Ocurrió un error: ${error.message}`
          : 'Ocurrió un error al procesar tu solicitud.';

      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: `❌ ${errMsg}` }).catch(() => {});
      }
    }
  },
};
