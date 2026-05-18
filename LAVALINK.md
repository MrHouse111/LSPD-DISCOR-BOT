Lavalink setup

- Install Java 17+.
- Download Lavalink jar (e.g. Lavalink.jar) from official source.
- Configure `application.yml` inside Lavalink distribution with a `server.password` value.
- Start Lavalink: `java -Djdk.tls.namedGroups="secp256k1" -jar Lavalink.jar` (adjust JVM options as needed).

Environment variables for this bot (set these before running):

- `LAVALINK_HOST` — host or IP of the Lavalink server (default: `localhost`).
- `LAVALINK_PORT` — port of the Lavalink server (default: `2333`).
- `LAVALINK_PASSWORD` — password configured in Lavalink's `application.yml`.
- `LAVALINK_SECURE` — `true` if using TLS/HTTPS, otherwise `false`.

Example `.env` entries:

LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=your_lavalink_password
LAVALINK_SECURE=false

Notes
- The bot will automatically attempt to use Lavalink if the above env vars are set.
- If Lavalink is not configured, the bot falls back to the local voice playback behavior provided by `discord-player`.
