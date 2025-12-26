const { SlashCommandBuilder } = require('discord.js');
const ytSearch = require('yt-search');
const player = require('../../utils/player');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { exec } = require('child_process');

// Helper function to get video info using yt-dlp
const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        let command = 'yt-dlp --dump-json --no-playlist --quiet --remote-components ejs:github';
        
        // --- INTEGRATION PATCH START ---
        // Inject the POT Provider Configuration
        // We use the Modern Syntax (youtubepot-bgutilhttp)
        const potUrl = process.env.POT_URL || 'http://pot-provider:4444';
        command += ` --extractor-args "youtubepot-bgutilhttp:base_url=${potUrl}"`;
        // --- INTEGRATION PATCH END ---

        // Inject environment options (e.g. for PO Token plugin)
        if (process.env.YTDL_OPTIONS) {
            command += ` ${process.env.YTDL_OPTIONS}`;
        }

        if (fs.existsSync('./cookies.json')) {
            const stats = fs.statSync('./cookies.json');
            if (stats.isFile() && stats.size > 0) {
                command += ' --cookies ./cookies.json';
            }
        }
        
        // Escape double quotes in URL just in case, though usually URLs don't have them
        command += ` "${url.replace(/"/g, '\\"')}"`;

        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                // logger.error(`[yt-dlp info error] ${stderr}`); // Optional logging
                reject(error);
                return;
            }
            try {
                const info = JSON.parse(stdout);
                resolve(info);
            } catch (e) {
                reject(e);
            }
        });
    });
};

// Basic validation for YouTube URLs
const isYouTubeURL = (url) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(url);
};

module.exports = {
    data: {
        name: 'play',
        description: 'Plays a song from YouTube or a Playlist',
        aliases: ['p']
    },
    async execute(message, args) {
        if (!message.member.voice.channel) {
            return message.reply('You need to be in a voice channel to play music!');
        }

        const permissions = message.member.voice.channel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('I need the permissions to join and speak in your voice channel!');
        }

        if (!args.length) {
            return message.reply('You need to provide a song URL, name, or playlist name!');
        }

        const query = args.join(' ');
        logger.info(`[Command: Play] User ${message.author.tag} requested: ${query}`);

        let queue = player.getQueue(message.guild.id);

        if (!queue) {
            logger.info(`[Command: Play] Creating new queue for guild ${message.guild.id}`);
            queue = player.createQueue(message.guild.id);
            try {
                const connection = await player.connectToChannel(message.member.voice.channel);
                connection.subscribe(queue.player);
                queue.connection = connection;
            } catch (error) {
                logger.error(`[Command: Play] Failed to connect to voice channel`, error);
                player.deleteQueue(message.guild.id);
                return message.reply('Could not join the voice channel!');
            }
        }

        // Check if query is a local playlist
        const playlistsFolder = process.env.PLAYLISTS_FOLDER || 'Playlists';
        const playlistPath = path.join(process.cwd(), playlistsFolder, `${query}.txt`);

        if (fs.existsSync(playlistPath)) {
            logger.info(`[Command: Play] Loading local playlist: ${query}`);
            await message.reply(`📂 Loading playlist **${query}**...`);
            const content = fs.readFileSync(playlistPath, 'utf-8');
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            
            let addedCount = 0;
            
            for (const line of lines) {
                try {
                    let songData = null;
                    if (isYouTubeURL(line)) {
                         const info = await getVideoInfo(line);
                         songData = {
                             title: info.title,
                             url: info.webpage_url,
                             duration: parseInt(info.duration),
                             thumbnail: info.thumbnail
                         };
                    } else {
                        const results = await ytSearch(line);
                        if (results.videos.length > 0) {
                            const video = results.videos[0];
                            songData = {
                                title: video.title,
                                url: video.url,
                                duration: video.seconds,
                                thumbnail: video.thumbnail
                            };
                        }
                    }

                    if (songData) {
                        queue.songs.push(songData);
                        addedCount++;
                        if (!queue.playing && addedCount === 1) {
                            player.playSong(message.guild.id, queue.songs[0]);
                            message.channel.send(`🎶 Now playing: **${queue.songs[0].title}**`);
                        }
                    }
                } catch (e) {
                    logger.error(`[Command: Play] Error loading track from playlist: ${line}`, e);
                }
            }
            
            return message.channel.send(`✅ Added **${addedCount}** songs from playlist **${query}**`);
        }

        // Normal Play Logic (YouTube URL/Search)
        await message.reply(`🔎 Searching for **${query}**...`);

        try {
            let songs = [];

            // Verifica se è un URL valido di YouTube
            if (isYouTubeURL(query)) {
                logger.info(`[Command: Play] Query is a valid YouTube URL`);
                try {
                    const info = await getVideoInfo(query);
                    songs.push({
                        title: info.title,
                        url: info.webpage_url,
                        duration: parseInt(info.duration),
                        thumbnail: info.thumbnail
                    });
                } catch (e) {
                    logger.error(`[Command: Play] Error getting video info with yt-dlp`, e);
                    return message.channel.send('Could not load video info!');
                }
            } else {
                // Se non è un URL, prova a cercare
                logger.info(`[Command: Play] Performing search for: ${query}`);
                
                // Verifica se è una playlist URL (yt-search gestisce le liste se passiamo l'ID o l'URL, ma ytdl è meglio per i singoli)
                // Per semplicità, usiamo yt-search per tutto ciò che non è un video diretto
                const searchResult = await ytSearch(query);

                if (searchResult.videos.length > 0) {
                     // Se è una ricerca generica, prendiamo il primo video
                     const video = searchResult.videos[0];
                     songs.push({
                        title: video.title,
                        url: video.url,
                        duration: video.seconds,
                        thumbnail: video.thumbnail
                    });
                } else if (searchResult.lists && searchResult.lists.length > 0) {
                    // Gestione base playlist da ricerca (non implementata profondamente qui per brevità, ma yt-search può trovarle)
                    // Per ora fallback su video
                    return message.channel.send('No video results found!');
                } else {
                    return message.channel.send('No results found!');
                }
            }

            if (songs.length === 0) return;

            logger.info(`[Command: Play] Adding ${songs.length} songs to queue`);
            songs.forEach(song => queue.songs.push(song));

            if (!queue.playing) {
                logger.info(`[Command: Play] Queue was empty, starting playback immediately`);
                player.playSong(message.guild.id, queue.songs[0]);
                message.channel.send(`🎶 Now playing: **${queue.songs[0].title}**`);
            } else {
                if (songs.length === 1) {
                    message.channel.send(`✅ Added to queue: **${songs[0].title}**`);
                }
            }

        } catch (error) {
            logger.error(`[Command: Play] Error processing request`, error);
            message.channel.send('There was an error trying to play that song!');
        }
    },
};
