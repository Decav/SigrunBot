# SigrunBot — Bot de Música para Discord

Bot de música multiplataforma para Discord con soporte de **YouTube** (videos, playlists, mixes) y **Spotify** (canciones, álbumes, playlists). Construido con `discord.js` v14 y `distube` v5.

## Características

- 🎵 **Búsqueda por texto**: encuentra canciones escribiendo el nombre
- 🔗 **YouTube**: videos, playlists y mixes/radio
- 🟢 **Spotify**: canciones, álbumes y playlists (vía oEmbed + búsqueda en YouTube)
- 🎛️ **Botones interactivos**: pausar, reanudar, saltar, anterior, volumen en el embed
- 📋 **Cola independiente** por servidor
- 🔍 **Autocomplete** en `/play` con sugerencias de YouTube
- 🚪 **Desconexión automática** al vaciarse el canal de voz

## Requisitos Previos

- [Node.js](https://nodejs.org) v18 o superior
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) instalado en el sistema
- [ffmpeg](https://ffmpeg.org) instalado en el sistema
- Bot de Discord registrado en [Discord Developer Portal](https://discord.com/developers/applications)

## Comandos

| Comando | Descripción |
|---|---|
| `/play <canción/enlace>` | Reproduce una canción (YouTube, Spotify o búsqueda) |
| `/skip` | Salta a la siguiente canción |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la reproducción |
| `/queue [página]` | Muestra la cola de reproducción |
| `/stop` | Detiene la música y desconecta al bot |

## Instalación Local

```bash
git clone https://github.com/TU_USUARIO/sigrun-bot.git
cd sigrun-bot
npm install
```

Copia `.env.example` a `.env` y configura tus credenciales:

```env
DISCORD_TOKEN=token_de_tu_bot
CLIENT_ID=id_de_tu_aplicacion
GUILD_ID=id_de_tu_servidor  # opcional, solo para deploy rápido
```

Registra los comandos slash e inicia:

```bash
npm run deploy
npm start
```

## Intents de Discord

En el [Discord Developer Portal](https://discord.com/developers/applications), habilita:

- **Bot** → Privileged Gateway Intents:
  - ✅ MESSAGE CONTENT INTENT
  - ✅ SERVER MEMBERS INTENT

## Despliegue en Fly.io

El proyecto incluye `Dockerfile` y `fly.toml` listos para desplegar.

```bash
fly launch
fly secrets set DISCORD_TOKEN=tu_token CLIENT_ID=tu_client_id
fly deploy
```

## Estructura

```
sigrun-bot/
├── commands/           # Comandos slash (/play, /skip, /pause, etc.)
├── events/
│   ├── distube/        # Eventos de reproducción (playSong, addSong, etc.)
│   ├── interactionCreate.js
│   └── ready.js
├── index.js            # Entry point
├── deploy.js           # Registro de comandos
├── config.js           # Configuración global
├── Dockerfile          # Imagen para Fly.io
├── fly.toml            # Config de Fly.io
└── .env.example        # Variables de entorno
```

## Stack Técnico

- [discord.js](https://discord.js.org) v14 — API de Discord
- [distube](https://distube.js.org) v5 — Motor de música
- [@distube/yt-dlp](https://github.com/distubejs/yt-dlp) — Extracción de audio
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Resolución de videos
- [ffmpeg](https://ffmpeg.org) — Transcodificación de audio
