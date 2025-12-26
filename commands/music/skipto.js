const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'skipto',
        description: 'Skips to a specific song in the queue',
        aliases: ['jumpto']
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
            return message.reply('Please provide the index of the song to skip to!');
        }

        const index = parseInt(args[0]);

        if (isNaN(index) || index < 1 || index >= queue.songs.length) {
            return message.reply(`Please provide a valid number between 1 and ${queue.songs.length - 1}!`);
        }

        // Rimuovi le canzoni tra quella corrente e quella target
        // queue.songs[0] è quella corrente. Vogliamo che queue.songs[index] diventi la nuova queue.songs[0] dopo lo skip
        // Quindi rimuoviamo da 1 a index-1.
        // Ma player.js gestisce lo shift automatico quando finisce la canzone.
        // Se facciamo queue.songs.splice(0, index), rimuoviamo la corrente e tutte quelle prima della target.
        // La target diventa la nuova 0.
        // Poi chiamiamo stop() per triggerare l'evento idle che suonerà la nuova 0.
        
        queue.songs.splice(0, index);
        queue.player.stop();
        
        await message.reply(`⏭️ Skipped to **${queue.songs[0].title}**!`);
    },
};
