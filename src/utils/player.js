const { createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const logger = require('./logger');
const http = require('http'); // Added for debug check

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

// Helper function to check POT provider connectivity
function checkPotProvider(url) {
    return new Promise((resolve) => {
        try {
            const req = http.get(url + '/health', (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.setTimeout(1000, () => {
                req.destroy();
                resolve(false);
            });
        } catch (e) {
            resolve(false);
        }
    });
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

        const potUrl = process.env.POT_URL || 'http://pot-provider:4416';
        const hasCookies = fs.existsSync('./cookies.json') && fs.statSync('./cookies.json').size > 0;

        const attempts = [];
        if (hasCookies) {
            attempts.push({ type: 'cookies', name: 'Cookies Only' });
        }
        attempts.push({ type: 'pot', name: 'PO Token Only' });

        const tryPlay = (attemptIndex) => {
            if (attemptIndex >= attempts.length) {
                logger.error(`[Player] All attempts failed for song: ${song.title}`);
                const failedSong = queue.songs.shift();
                if (queue.loop === 'queue') {
                    queue.songs.push(failedSong);
                }

                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                } else {
                    queue.playing = false;
                }
                return;
            }

            const attempt = attempts[attemptIndex];
            logger.info(`[Player] Attempting to stream: ${song.title} (Strategy: ${attempt.name})`);

            const args = [
                song.url,
                '-o', '-',
                '-q',
                '-f', 'bestaudio',
                '--no-playlist',
                '--limit-rate', '100K'
            ];

            if (attempt.type === 'pot') {
                 args.push(
                    '--remote-components', 'ejs:github',
                    '--extractor-args', `youtubepot-bgutilhttp:base_url=${potUrl}`,
                    '--extractor-args', 'youtube:player_client=web'
                 );
            } else if (attempt.type === 'cookies') {
                 args.push('--cookies', './cookies.json');
            }

            if (process.env.YTDL_OPTIONS) {
                const extraArgs = parseArgs(process.env.YTDL_OPTIONS);
                args.push(...extraArgs);
                logger.info(`[Player] Injected YTDL_OPTIONS: ${process.env.YTDL_OPTIONS}`);
            }

            logger.info(`[DEBUG] yt-dlp arguments: ${JSON.stringify(args)}`);

            const ytDlpProcess = spawn('yt-dlp', args);
            
            // Variabili per gestire il "falso inizio"
            let streamStarted = false;
            let streamStartTime = 0;
            const MIN_PLAY_TIME_MS = 5000; // Se muore prima di 5 secondi, è un fallimento

            const onReadable = () => {
                if (streamStarted) return;
                streamStarted = true;
                streamStartTime = Date.now();
                logger.info(`[Player] Stream started successfully (Strategy: ${attempt.name})`);
                
                const resource = createAudioResource(ytDlpProcess.stdout, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true,
                    highWaterMark: 1 << 20
                });
                resource.volume.setVolume(queue.volume / 100);

                queue.player.play(resource);
                queue.playing = true;
                logger.info(`[Player] Resource played on audio player`);
            };

            const onExit = (code) => {
                const playDuration = Date.now() - streamStartTime;
                const wasShortPlay = streamStarted && playDuration < MIN_PLAY_TIME_MS;

                if (!streamStarted || wasShortPlay) {
                    if (wasShortPlay) {
                        logger.warn(`[Player] Strategy ${attempt.name} died too quickly (${playDuration}ms). Treating as failure.`);
                    } else {
                        logger.warn(`[Player] Strategy ${attempt.name} failed to start (Exit code ${code}).`);
                    }
                    
                    // Se siamo già in riproduzione ma fallisce subito, fermiamo il player per evitare rumore
                    if (wasShortPlay) {
                        queue.player.stop();
                    }
                    
                    tryPlay(attemptIndex + 1);
                } else {
                    if (code !== 0 && code !== null) {
                         logger.warn(`[yt-dlp] Process exited with code ${code}`);
                    } else {
                        logger.info(`[yt-dlp] Process exited successfully (code 0)`);
                    }
                }
            };

            ytDlpProcess.on('error', (err) => {
                logger.error(`[yt-dlp] Spawn error: ${err.message}`);
                if (!streamStarted) {
                     tryPlay(attemptIndex + 1);
                }
            });

            ytDlpProcess.stdout.once('readable', onReadable);
            ytDlpProcess.once('exit', onExit);

            ytDlpProcess.stderr.on('data', (data) => {
                const msg = data.toString();
                // Ignora i log di progresso di yt-dlp per non intasare la console
                if (!msg.includes('[download]')) {
                    logger.info(`[yt-dlp STDERR]: ${msg}`);
                }
            });
        };

        tryPlay(0);
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