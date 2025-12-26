const player = require('../../utils/player');
const permissions = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'volume',
        description: 'Sets the volume of the player',
        aliases: ['vol']
    },
    async execute(message, args) {
        if (!permissions.checkDJ(message)) return;

        const queue = player.getQueue(message.guild.id);

        if (!queue || !queue.playing) {
            return message.reply('There is no music playing!');
        }

        if (!args.length) {
            return message.reply(`The current volume is **${queue.volume}%**`);
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume) || volume < 0 || volume > 150) {
            return message.reply('Please provide a valid volume between 0 and 150!');
        }

        queue.volume = volume;
        
        if (queue.player.state.resource && queue.player.state.resource.volume) {
            queue.player.state.resource.volume.setVolume(volume / 100);
        }

        await message.reply(`🔊 Volume set to **${volume}%**`);
    },
};
