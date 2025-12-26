const { createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');

// Configura play-dl con i token se presenti
if (process.env.YT_PO_TOKEN && process.env.YT_VISITOR_DATA) {
    play.setToken({
        youtube: {
            cookie: "" // Se hai i cookie completi
        }
    });
}

const queues = new Map();

module.exports = {
    getQueue: (guildId) => queues.get(guildId),
    createQueue: (guildId) => {
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

        queue.player.on(AudioPlayerStatus.Idle, () => {
            if (queue.loop === 'song') {
                // Ripeti la canzone corrente
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                }
            } else if (queue.loop === 'queue') {
                // Sposta la canzone finita in fondo alla coda
                const finishedSong = queue.songs.shift();
                queue.songs.push(finishedSong);
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                }
            } else {
                // Comportamento normale: rimuovi la canzone finita
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    module.exports.playSong(guildId, queue.songs[0]);
                } else {
                    queue.playing = false;
                }
            }
        });

        queue.player.on('error', error => {
            console.error(`Error: ${error.message} with resource`);
            // In caso di errore, passiamo alla prossima (evitando loop infinito su errore se loop è attivo)
            // Per sicurezza, se c'è errore, shiftiamo sempre per evitare blocchi
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
            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });

            resource.volume.setVolume(queue.volume / 100);

            queue.player.play(resource);
            queue.playing = true;
        } catch (error) {
            console.error(error);
            // Gestione errore riproduzione: passa alla prossima
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
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }
};
