const { createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const logger = require('./logger');

const queues = new Map();

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
            loop: false // false, 'song', 'queue'
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
            
            // Arguments for yt-dlp
            const args = [
                song.url,
                '-o', '-',
                '-q',
                '-f', 'bestaudio',
                '--no-playlist',
                '--limit-rate', '100K'
            ];

            // Check for cookies.json
            if (fs.existsSync('./cookies.json')) {
                args.push('--cookies', './cookies.json');
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
                inlineVolume: true
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
