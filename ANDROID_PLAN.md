# Sigrun Player — App Android Offline

Plan técnico para portar la lógica de SigrunBot a una app Android de reproducción de música.

---

## Lo que se reutiliza del bot

| Concepto | En el bot | En Android |
|---|---|---|
| Búsqueda texto | `play.js:searchYoutube()` → yt-dlp `ytsearch:` | `ProcessBuilder` + mismo flag |
| Resolver video | `patch-ytdlp.js` → `--format bestaudio/best --extractor-args youtube:player_client=android,ios` | Idéntico. El stream URL lo reproduce ExoPlayer |
| Spotify | `play.js:resolveSpotify()` → oEmbed → buscar en YT | `okhttp GET` + misma lógica |
| Radio Mix | `play.js:resolveRadioMix()` → `--flat-playlist --playlist-end 25` | Mismo comando yt-dlp |
| Cola | `distube` gestiona `queue.songs[]` | `List<Song>` en memoria en un ViewModel |

## Lo que NO se necesita

- `ffmpeg`: ExoPlayer/Media3 decodifica AAC/Opus/M4A nativo
- `@discordjs/opus`: solo Discord requiere Opus encoding
- `distube` / `discord.js`: solo sirven para Discord
- Servidor: todo corre local en el dispositivo

## Stack del APK

| Capa | Tecnología |
|---|---|
| UI | Jetpack Compose (Kotlin) |
| Reproducción | Media3 ExoPlayer |
| HTTP | OkHttp / Retrofit (solo para oEmbed de Spotify) |
| Motor de búsqueda | `yt-dlp` binario ARM, invocado vía `ProcessBuilder` |
| Background | `MediaSessionService` + `ForegroundService` |
| Cola | `ViewModel` + `StateFlow` |

## Estructura del proyecto

```
app/
└── src/main/
    ├── assets/yt-dlp              ← binario ARM (~20MB)
    ├── java/com/sigrun/player/
    │   ├── MainActivity.kt
    │   ├── YtDlpEngine.kt         ← ProcessBuilder wrapper
    │   ├── SpotifyResolver.kt     ← oEmbed → search
    │   ├── PlayerService.kt       ← foreground + MediaSession
    │   └── ui/
    │       ├── SearchScreen.kt
    │       ├── PlayerScreen.kt    ← controles, portada, volumen
    │       └── QueueSheet.kt
    └── AndroidManifest.xml
```

## Flujos de datos

### Búsqueda por texto

```
texto → ProcessBuilder(
          "yt-dlp --dump-json --flat-playlist --playlist-end 10 ytsearch10:query"
        )
      → parsear 10 líneas JSON
      → mostrar resultados (title, thumbnail, duration)
```

### Reproducir un video

```
tap en resultado → ProcessBuilder(
                     "yt-dlp --dump-single-json --skip-download
                      --format bestaudio/best
                      --extractor-args youtube:player_client=android,ios
                      https://www.youtube.com/watch?v=XXXXX"
                   )
                 → extraer format.url del JSON
                 → ExoPlayer.setMediaItem(url)
```

Las URLs de stream obtenidas con los clientes Android/iOS de YouTube son estables durante varias horas.

### Spotify

```
link de Spotify → GET https://open.spotify.com/oembed?url=...
                → { title, author_name }
                → buscar "author_name title" en YouTube
                → reproducir primer resultado
```

La API oEmbed de Spotify es gratuita y no requiere autenticación.

### Radio Mix de YouTube

```
link con &list=RD → ProcessBuilder(
                      "yt-dlp --flat-playlist --playlist-end 25
                       --dump-json --skip-download url"
                    )
                  → 25 líneas JSON
                  → extraer webpage_url de cada una
                  → añadir todas a la cola
```

`--flat-playlist` es clave: extrae solo IDs y títulos (~2 segundos), sin metadata completa de cada video.

---

## YtDlpEngine.kt — La pieza central

```kotlin
object YtDlpEngine {

    private val ytDlpPath: String by lazy {
        // Extraer binario de assets/ a filesDir/ en el primer acceso
        val context = App.instance
        val dest = File(context.filesDir, "yt-dlp")
        if (!dest.exists()) {
            context.assets.open("yt-dlp").use { input ->
                FileOutputStream(dest).use { output ->
                    input.copyTo(output)
                }
            }
            dest.setExecutable(true)
        }
        dest.absolutePath
    }

    fun search(query: String): List<Song> {
        val args = listOf(
            "--dump-json", "--flat-playlist", "--playlist-end", "10",
            "--skip-download", "--no-warnings",
            "ytsearch10:$query"
        )
        val output = execute(args)
        return output.lines().map { parseSong(it) }
    }

    fun getStreamUrl(videoUrl: String): String {
        val args = listOf(
            "--dump-single-json", "--skip-download", "--no-warnings",
            "--format", "bestaudio/best",
            "--extractor-args", "youtube:player_client=android,ios",
            videoUrl
        )
        val json = execute(args)
        val info = Json.parseToJsonElement(json).jsonObject
        val formats = info["formats"]!!.jsonArray
        val bestAudio = formats.first {
            it.jsonObject["acodec"]?.jsonPrimitive?.content != "none" &&
            it.jsonObject["vcodec"]?.jsonPrimitive?.content == "none"
        }
        return bestAudio.jsonObject["url"]!!.jsonPrimitive.content
    }

    fun resolveMix(mixUrl: String): List<Song> {
        val args = listOf(
            "--dump-json", "--flat-playlist", "--playlist-end", "25",
            "--skip-download", "--no-warnings",
            mixUrl
        )
        val output = execute(args)
        return output.lines().map { parseSong(it) }
    }

    private fun execute(args: List<String>): String {
        val process = ProcessBuilder(listOf(ytDlpPath) + args)
            .redirectErrorStream(true)
            .start()
        return process.inputStream.bufferedReader().readText()
            .also { process.waitFor() }
    }
}
```

---

## SpotifyResolver.kt

```kotlin
object SpotifyResolver {

    private val client = OkHttpClient()

    suspend fun resolve(spotifyUrl: String): String {
        val oembedUrl = "https://open.spotify.com/oembed?" +
                        "url=${URLEncoder.encode(spotifyUrl, "UTF-8")}"

        val request = Request.Builder().url(oembedUrl).build()
        val response = client.newCall(request).await()
        val json = Json.parseToJsonElement(response.body!!.string()).jsonObject

        val title = json["title"]?.jsonPrimitive?.content ?: ""
        val author = json["author_name"]?.jsonPrimitive?.content ?: ""

        val results = YtDlpEngine.search("$author $title")
        return results.first().webpageUrl
    }
}
```

---

## Requisitos del entorno de compilación (el otro PC)

- **Android Studio** Hedgehog o superior
- **JDK 17**
- **Kotlin 2.0+**
- **Gradle 8.x** con AGP 8.x
- Dependencias en `build.gradle.kts`:
  - `androidx.media3:media3-exoplayer`
  - `androidx.media3:media3-session`
  - `com.squareup.okhttp3:okhttp`
  - `org.jetbrains.kotlinx:kotlinx-serialization-json`
- Binario `yt-dlp` para ARM64 descargado de [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases/latest)

---

## Permisos en AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## Notas finales

- **Solo uso personal**: YouTube ToS prohíbe apps que eviten anuncios en Google Play. Como APK privado no hay problema.
- **yt-dlp se actualiza**: cada ~2 meses cambia. Con `--update` o descargando el binario nuevo se mantiene.
- **Memoria**: yt-dlp usa ~80-120MB durante la resolución. No es problema en ningún teléfono moderno.
- **Stream URLs**: expiran en ~6 horas. Si el usuario pausa mucho tiempo, hay que re-resolver.
