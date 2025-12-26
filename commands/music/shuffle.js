const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'shuffle',
        description: 'Shuffles the queue',
        aliases: ['random']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue || queue.songs.length <= 1) {
            return message.reply('Not enough songs in the queue to shuffle!');
        }

        if (!message.member.voice.channel || message.member.voice.channel.id !== queue.connection.joinConfig.channelId) {
            return message.reply('You must be in the same voice channel as the bot!');
        }

        // Shuffle algorithm (Fisher-Yates)
        // Manteniamo la canzone corrente (indice 0) ferma
        const currentSong = queue.songs[0];
        const songsToShuffle = queue.songs.slice(1);

        for (let i = songsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
        }

        queue.songs = [currentSong, ...songsToShuffle];

        await message.reply('🔀 Shuffled the queue!');
    },
};
