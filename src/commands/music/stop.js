const player = require('../../utils/player');
const permissions = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'stop',
        description: 'Stops the music and clears the queue',
        aliases: ['leave', 'disconnect']
    },
    async execute(message, args) {
        if (!permissions.checkDJ(message)) return;

        const queue = player.getQueue(message.guild.id);

        if (!queue) {
            return message.reply('There is no music playing!');
        }

        queue.songs = [];
        queue.player.stop();
        if (queue.connection) {
            queue.connection.destroy();
        }
        player.deleteQueue(message.guild.id);
        
        await message.reply('🛑 Stopped the music and left the channel!');
    },
};
