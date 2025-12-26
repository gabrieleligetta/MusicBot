const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'repeat',
        description: 'Toggles repeat mode (off, song, queue)',
        aliases: ['loop']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue) {
            return message.reply('There is no music playing!');
        }

        if (!message.member.voice.channel || message.member.voice.channel.id !== queue.connection.joinConfig.channelId) {
            return message.reply('You must be in the same voice channel as the bot!');
        }

        // Stati: false (OFF) -> 'song' (ONE) -> 'queue' (ALL) -> false
        if (!queue.loop) {
            queue.loop = 'song';
            message.reply('🔂 Repeat mode set to **Song**');
        } else if (queue.loop === 'song') {
            queue.loop = 'queue';
            message.reply('🔁 Repeat mode set to **Queue**');
        } else {
            queue.loop = false;
            message.reply('➡️ Repeat mode **OFF**');
        }
    },
};
