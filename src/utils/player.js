const { createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const logger = require('./logger');

const queues = new Map();

// Helper to parse shell-like arguments string into array
function parseArgs(str) {
    if (!str) return [];
    const args = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inQuote) {
            if (char === quoteChar) {
                inQuote = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"' || char === "'") {
                inQuote = true;
                quoteChar = char;
            } else if (char === ' ') {
                if (current.length > 0) {
                    args.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }
    }
    if (current.length > 0) args.push(current);
    return args;
}

module.exports = {
    getQueue: (guildId) => queues.get(guildId),
    createQueue: (guildId) => {
        logger.info(`[Player] Creating audio player for guild ${guildId}`);
        const queue = {
            songs: [],
            player: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            }),
            connection: null,
            volume: 100,
            playing: false,
            loop: false, // false, 'song', 'queue'
            autoleaveTimer: null
        };

        // Log player state changes
        queue.player.on('stateChange', (oldState, newState) => {
            logger.info(`[Player] State changed from ${oldState.status} to ${newState.status} for guild ${guildId}`);
        });

        queue.player.on(AudioPlayerStatus.Idle, () => {
            logger.info(`[Player] Player is Idle for guild ${guildId}`);
            if (queue.loop === 'song') {
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                }
            } else if (queue.loop === 'queue') {
                const finishedSong = queue.songs.shift();
                queue.songs.push(finishedSong);
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                }
            } else {
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                } else {
                    logger.info(`[Player] Queue finished for guild ${guildId}`);
                    queue.playing = false;
                }
            }
        });

        queue.player.on('error', error => {
            logger.error(`[Player] Error for guild ${guildId}`, error);
            const failedSong = queue.songs.shift();
            if (queue.loop === 'queue') {
                queue.songs.push(failedSong);
            }
            
            if (queue.songs.length > 0) {
                module.exports.playSong(guildId, queue.songs[0]);
            } else {
                queue.playing = false;
            }
        });

        queues.set(guildId, queue);
        return queue;
    },
    deleteQueue: (guildId) => queues.delete(guildId),
    
    playSong: async (guildId, song) => {
        const queue = queues.get(guildId);
        if (!queue) return;

        try {
            logger.info(`[Player] Attempting to stream: ${song.title} (${song.url})`);
            
            const potUrl = process.env.POT_URL || 'http://pot-provider:4444';

            // Arguments for yt-dlp
            const args = [
                song.url,
                '-o', '-',
                '-q',
                '-f', 'bestaudio',
                '--no-playlist',
                '--limit-rate', '100K',
                // Abilita il download dei componenti per risolvere la challenge di YouTube
                '--remote-components', 'ejs:github',
                // --- INTEGRATION PATCH START ---
                // Inject the POT Provider Configuration
                // We use the Modern Syntax (youtubepot-bgutilhttp)
                '--extractor-args', `youtubepot-bgutilhttp:base_url=${potUrl}`
                // --- INTEGRATION PATCH END ---
            ];

            // Inject environment options (e.g. for PO Token plugin)
            if (process.env.YTDL_OPTIONS) {
                const extraArgs = parseArgs(process.env.YTDL_OPTIONS);
                args.push(...extraArgs);
                logger.info(`[Player] Injected YTDL_OPTIONS: ${process.env.YTDL_OPTIONS}`);
            }

            // Check for cookies.json
            if (fs.existsSync('./cookies.json')) {
                const stats = fs.statSync('./cookies.json');
                if (stats.isFile() && stats.size > 0) {
                    args.push('--cookies', './cookies.json');
                }
            }

            const ytDlpProcess = spawn('yt-dlp', args);
            
            logger.info(`[Player] Stream created with yt-dlp`);

            ytDlpProcess.stderr.on('data', (data) => {
                // Only log if it's not just a warning or info that slips through -q
                logger.error(`[yt-dlp Error]: ${data.toString()}`);
            });

            ytDlpProcess.on('close', (code) => {
                if (code !== 0 && code !== null) {
                     logger.warn(`[yt-dlp] Process exited with code ${code}`);
                }
            });
            
            const resource = createAudioResource(ytDlpProcess.stdout, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true,
                // Aumenta il buffer a 1MB (default è molto basso, circa 64kb)
                // Questo aiuta a prevenire i salti se la CPU o la rete hanno un picco
                highWaterMark: 1 << 20
            });
            logger.info(`[Player] Audio resource created`);

            resource.volume.setVolume(queue.volume / 100);

            queue.player.play(resource);
            queue.playing = true;
            logger.info(`[Player] Resource played on audio player`);
        } catch (error) {
            logger.error(`[Player] Error playing song: ${song.title}`, error);
            const failedSong = queue.songs.shift();
            if (queue.loop === 'queue') {
                queue.songs.push(failedSong);
            }

            if (queue.songs.length > 0) {
                module.exports.playSong(guildId, queue.songs[0]);
            } else {
                queue.playing = false;
            }
        }
    },

    connectToChannel: async (channel) => {
        logger.info(`[Connection] Connecting to voice channel: ${channel.id} in guild ${channel.guild.id}`);
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        connection.on('stateChange', (oldState, newState) => {
            logger.info(`[Connection] State changed from ${oldState.status} to ${newState.status} for guild ${channel.guild.id}`);
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            logger.info(`[Connection] Successfully connected (Ready) to voice channel ${channel.id}`);
            return connection;
        } catch (error) {
            logger.error(`[Connection] Failed to connect to voice channel ${channel.id}`, error);
            connection.destroy();
            throw error;
        }
    }
};
