const { EmbedBuilder } = require('discord.js');
const player = require('../../utils/player');

module.exports = {
    data: {
        name: 'queue',
        description: 'Shows the current music queue',
        aliases: ['list', 'q']
    },
    async execute(message, args) {
        const queue = player.getQueue(message.guild.id);

        if (!queue || queue.songs.length === 0) {
            return message.reply('The queue is empty!');
        }

        const currentSong = queue.songs[0];
        const nextSongs = queue.songs.slice(1, 11); // Show next 10 songs

        const embed = new EmbedBuilder()
            .setColor(message.guild.members.me.displayColor)
            .setTitle('🎶 Music Queue')
            .setDescription(`**Now Playing:**\n[${currentSong.title}](${currentSong.url}) | \`${formatTime(currentSong.duration)}\`\n\n**Up Next:**\n${nextSongs.map((song, index) => `**${index + 1}.** [${song.title}](${song.url}) | \`${formatTime(song.duration)}\``).join('\n') || 'No more songs in queue.'}`)
            .setFooter({ text: `${queue.songs.length} songs in queue` });

        await message.channel.send({ embeds: [embed] });
    },
};

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
