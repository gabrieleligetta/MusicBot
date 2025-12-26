const { SlashCommandBuilder } = require('discord.js');
const play = require('play-dl');
const player = require('../../utils/player');
const fs = require('fs');
const path = require('path');

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
            // Se non ci sono argomenti, controlliamo se c'è un allegato (file .txt o audio)
            if (message.attachments.size > 0) {
                // Gestione file allegati (futuro)
                return message.reply('Playing from attachments is not supported yet.');
            }
            return message.reply('You need to provide a song URL, name, or playlist name!');
        }

        const query = args.join(' ');
        let queue = player.getQueue(message.guild.id);

        if (!queue) {
            queue = player.createQueue(message.guild.id);
            try {
                const connection = await player.connectToChannel(message.member.voice.channel);
                connection.subscribe(queue.player);
                queue.connection = connection;
            } catch (error) {
                player.deleteQueue(message.guild.id);
                return message.reply('Could not join the voice channel!');
            }
        }

        // Check if query is a local playlist
        const playlistsFolder = process.env.PLAYLISTS_FOLDER || 'Playlists';
        const playlistPath = path.join(process.cwd(), playlistsFolder, `${query}.txt`);

        if (fs.existsSync(playlistPath)) {
            await message.reply(`📂 Loading playlist **${query}**...`);
            const content = fs.readFileSync(playlistPath, 'utf-8');
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            
            let addedCount = 0;
            // Carichiamo le canzoni in background per non bloccare
            // Nota: play-dl search può essere lento se fatto in serie.
            // Per ora facciamo un approccio semplice: cerchiamo e aggiungiamo.
            
            for (const line of lines) {
                try {
                    // Semplificazione: assumiamo che le righe siano URL o query valide
                    // Per ottimizzare, potremmo parallelizzare o usare una coda di caricamento
                    // Ma per ora facciamo sequenziale per stabilità
                    
                    let songData = null;
                    if (play.yt_validate(line) === 'video') {
                         const info = await play.video_info(line);
                         songData = {
                             title: info.video_details.title,
                             url: info.video_details.url,
                             duration: info.video_details.durationInSec,
                             thumbnail: info.video_details.thumbnails[0].url
                         };
                    } else {
                        const results = await play.search(line, { limit: 1 });
                        if (results.length > 0) {
                            songData = {
                                title: results[0].title,
                                url: results[0].url,
                                duration: results[0].durationInSec,
                                thumbnail: results[0].thumbnails[0].url
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
                    console.error(`Error loading track from playlist: ${line}`, e);
                }
            }
            
            return message.channel.send(`✅ Added **${addedCount}** songs from playlist **${query}**`);
        }

        // Normal Play Logic (YouTube URL/Search)
        await message.reply(`🔎 Searching for **${query}**...`);

        try {
            let song_info;
            let songs = [];

            if (play.yt_validate(query) === 'video') {
                song_info = await play.video_info(query);
                songs.push({
                    title: song_info.video_details.title,
                    url: song_info.video_details.url,
                    duration: song_info.video_details.durationInSec,
                    thumbnail: song_info.video_details.thumbnails[0].url
                });
            } else if (play.yt_validate(query) === 'playlist') {
                const playlist = await play.playlist_info(query);
                const videos = await playlist.all_videos();
                videos.forEach(video => {
                    songs.push({
                        title: video.title,
                        url: video.url,
                        duration: video.durationInSec,
                        thumbnail: video.thumbnails[0].url
                    });
                });
                await message.channel.send(`Added **${songs.length}** songs from playlist **${playlist.title}**`);
            } else {
                const search_results = await play.search(query, { limit: 1 });
                if (search_results.length === 0) {
                    return message.channel.send('No results found!');
                }
                song_info = search_results[0];
                songs.push({
                    title: song_info.title,
                    url: song_info.url,
                    duration: song_info.durationInSec,
                    thumbnail: song_info.thumbnails[0].url
                });
            }

            if (songs.length === 0) return;

            songs.forEach(song => queue.songs.push(song));

            if (!queue.playing) {
                player.playSong(message.guild.id, queue.songs[0]);
                message.channel.send(`🎶 Now playing: **${queue.songs[0].title}**`);
            } else {
                if (songs.length === 1) {
                    message.channel.send(`✅ Added to queue: **${songs[0].title}**`);
                }
            }

        } catch (error) {
            console.error(error);
            message.channel.send('There was an error trying to play that song!');
        }
    },
};
