const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'skip',
        description: 'Skips the current song',
        aliases: ['s', 'next']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue || !queue.playing) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel || message.member.voice.channel.id !== queue.connection.joinConfig.channelId) {
            return message.reply('You must be in the same voice channel as the bot!');
        }

        // Stop the player, which triggers the Idle event, which plays the next song
        queue.player.stop();
        await message.reply('⏭️ Skipped the song!');
    },
};
