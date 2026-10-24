#!/bin/sh
set -e

if [ -n "$YT_COOKIES" ]; then
  echo "$YT_COOKIES" > /app/cookies.txt
  mkdir -p /root/.config/yt-dlp
  echo "--cookies /app/cookies.txt" > /root/.config/yt-dlp/config
  echo "Cookies de YouTube configuradas"
else
  echo "YT_COOKIES no configurado, usando yt-dlp sin cookies"
fi

exec node index.js
