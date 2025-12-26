const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'remove',
        description: 'Removes a song from the queue',
        aliases: ['delete']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue || queue.songs.length === 0) {
            return message.reply('The queue is empty!');
        }

        if (!message.member.voice.channel || message.member.voice.channel.id !== queue.connection.joinConfig.channelId) {
            return message.reply('You must be in the same voice channel as the bot!');
        }

        if (!args.length) {
            return message.reply('Please provide the index of the song to remove!');
        }

        const index = parseInt(args[0]);

        if (isNaN(index) || index < 1 || index >= queue.songs.length) {
            return message.reply(`Please provide a valid number between 1 and ${queue.songs.length - 1}! (Cannot remove currently playing song)`);
        }

        const removedSong = queue.songs.splice(index, 1)[0];
        await message.reply(`🗑️ Removed **${removedSong.title}** from the queue!`);
    },
};
