const { EmbedBuilder } = require('discord.js');
const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'nowplaying',
        description: 'Shows the song currently playing',
        aliases: ['np', 'current']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue || !queue.playing || queue.songs.length === 0) {
            return message.reply('There is no music playing!');
        }

        const song = queue.songs[0];
        
        // Calcola progresso (approssimativo)
        // Nota: per un progresso preciso servirebbe tracciare il tempo di inizio riproduzione nel player
        
        const embed = new EmbedBuilder()
            .setColor(message.guild.members.me.displayColor)
            .setTitle('Now Playing 🎶')
            .setDescription(`[${song.title}](${song.url})`)
            .setThumbnail(song.thumbnail)
            .addFields(
                { name: 'Duration', value: `\`${formatTime(song.duration)}\``, inline: true },
                { name: 'Requested by', value: message.author.toString(), inline: true }
            );

        await message.channel.send({ embeds: [embed] });
    },
};

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
