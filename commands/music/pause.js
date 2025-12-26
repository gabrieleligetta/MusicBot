const player = require('../../utils/player');
const permissions = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'pause',
        description: 'Pauses the current song',
        aliases: ['resume']
    },
    async execute(message, args) {
        if (!permissions.checkDJ(message)) return;

        const queue = player.getQueue(message.guild.id);

        if (!queue || !queue.playing) {
            return message.reply('There is no music playing!');
        }

        if (queue.player.state.status === 'paused') {
            queue.player.unpause();
            return message.reply('▶️ Resumed the music!');
        } else {
            queue.player.pause();
            return message.reply('Hz Paused the music!');
        }
    },
};
