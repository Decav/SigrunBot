require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let ffmpegPath;
try {
  const systemFfmpeg = execSync('which ffmpeg 2>/dev/null || echo /usr/bin/ffmpeg').toString().trim();
  if (systemFfmpeg && fs.existsSync(systemFfmpeg)) {
    ffmpegPath = systemFfmpeg;
  }
} catch {}
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  ffmpegPath = require('ffmpeg-static');
}
console.log(`🎵 ffmpeg path: ${ffmpegPath}`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  savePreviousSongs: true,
  ffmpeg: { path: ffmpegPath },
  plugins: [new YtDlpPlugin({ update: false })],
});

client.distube = distube;
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

const distubeEventsPath = path.join(__dirname, 'events', 'distube');
if (fs.existsSync(distubeEventsPath)) {
  const distubeEventFiles = fs.readdirSync(distubeEventsPath).filter((f) => f.endsWith('.js'));
  for (const file of distubeEventFiles) {
    const distubeEvent = require(path.join(distubeEventsPath, file));
    distube.on(distubeEvent.name, (...args) => distubeEvent.execute(...args));
  }
}

process.on('unhandledRejection', (error) => {
  console.error('[GLOBAL] Unhandled promise rejection:', error.message);
  console.error('[GLOBAL]', (error.stack || '').split('\n').slice(0, 5).join('\n'));
});

process.on('uncaughtException', (error) => {
  console.error('[GLOBAL] Uncaught exception:', error.message);
  console.error('[GLOBAL]', (error.stack || '').split('\n').slice(0, 5).join('\n'));
});

client.login(process.env.DISCORD_TOKEN);
