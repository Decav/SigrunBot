FROM node:22-slim

RUN apt-get update && apt-get install -y \
  ffmpeg \
  python3 \
  make \
  gcc \
  g++ \
  curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm rebuild @discordjs/opus
COPY patch-ytdlp.js ./
RUN node patch-ytdlp.js

COPY . .

RUN mkdir -p node_modules/@distube/yt-dlp/bin && \
    curl -fsSL -o node_modules/@distube/yt-dlp/bin/yt-dlp \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && \
    chmod +x node_modules/@distube/yt-dlp/bin/yt-dlp

CMD ["node", "index.js"]
