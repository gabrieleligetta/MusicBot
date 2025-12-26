const player = require('../../utils/player');
const permissions = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'forceskip',
        description: 'Skips the current song immediately (DJ only)',
        aliases: ['modskip']
    },
    async execute(message, args) {
        if (!permissions.checkDJ(message)) return;

        const queue = player.getQueue(message.guild.id);

        if (!queue || !queue.playing) {
            return message.reply('There is no music playing!');
        }

        queue.player.stop();
        await message.reply('⏭️ **Force Skipped** the song!');
    },
};
