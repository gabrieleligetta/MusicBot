# Discord MusicBot 🎵

A robust, Dockerized Discord Music Bot built with Node.js, designed to bypass YouTube's latest restrictions using a dedicated PO Token Provider sidecar.

## 🚀 Features

*   **YouTube Playback**: High-quality audio streaming using `yt-dlp`.
*   **Anti-Blocking System**:
    *   **Strategy 1**: Uses `cookies.json` (if provided) for authenticated access.
    *   **Strategy 2**: Automatically falls back to a **PO Token Provider** (bgutil-pot) if cookies fail or are missing.
*   **Dockerized**: Easy deployment with Docker Compose.
*   **Playlist Support**: Queue management, looping, and shuffling.

## 🛠️ Prerequisites

*   [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.
*   A Discord Bot Token (get it from the [Discord Developer Portal](https://discord.com/developers/applications)).

## ⚙️ Configuration

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd MusicBot
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory. You can copy the example:
    ```bash
    cp .env.example .env
    ```
    
    Edit `.env` and fill in your details:
    ```env
    DISCORD_TOKEN=your_discord_bot_token_here
    CLIENT_ID=your_discord_client_id_here
    GUILD_ID=your_discord_guild_id_here (optional, for faster command registration)
    POT_URL=http://pot-provider:4416
    NODE_ENV=production
    ```

3.  **Cookies (Optional but Recommended):**
    To play age-restricted videos or improve stability, export your YouTube cookies:
    *   Install a browser extension like "Get cookies.txt LOCALLY" (ensure you export as **JSON**).
    *   Go to YouTube and ensure you are logged in.
    *   Export cookies.
    *   Save the file as `cookies.json` in the project root.

## ▶️ How to Run

### Local / Production (Docker Compose)

The easiest way to run the bot is using Docker Compose. This spins up both the MusicBot and the PO Token Provider.

```bash
docker compose up -d
```

*   The bot will start and automatically connect to the PO Token Provider.
*   Logs can be viewed with: `docker compose logs -f`

### Manual / Development

If you want to run the bot locally without Docker (Node.js required), you still need the PO Token Provider running.

1.  Start the provider:
    ```bash
    docker run -d -p 4416:4416 ghcr.io/jim60105/bgutil-pot:latest
    ```
2.  Install dependencies and start the bot:
    ```bash
    npm install
    npm start
    ```

## 🏗️ Architecture

This project uses a microservices approach to handle YouTube's anti-bot protections:

*   **MusicBot**: The main Node.js application handling Discord commands and audio streaming.
*   **pot-provider**: A sidecar service (running `bgutil-pot`) that generates valid "Proof of Origin" (PO) tokens.

The bot implements a **Smart Fallback Strategy**:
1.  It first tries to stream using **Cookies** (if available).
2.  If that fails (or cookies are invalid), it automatically retries using the **PO Token**.

## 🤝 Contributing

Feel free to open issues or submit pull requests!
