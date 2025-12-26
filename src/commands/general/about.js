const { EmbedBuilder, version: djsVersion } = require('discord.js');
const packageJson = require('../../../package.json');

module.exports = {
    data: {
        name: 'about',
        description: 'Shows information about the bot',
        aliases: ['info']
    },
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setAuthor({ name: `About ${message.client.user.username}`, iconURL: message.client.user.displayAvatarURL() })
            .setDescription('A music bot converted from Java to Node.js, easy to host yourself!')
            .addFields(
                { name: 'Version', value: packageJson.version, inline: true },
                { name: 'Library', value: `Discord.js v${djsVersion}`, inline: true },
                { name: 'Developer', value: 'Converted by AI', inline: true },
                { name: 'Stats', value: `${message.client.guilds.cache.size} servers\n${message.client.users.cache.size} users`, inline: true }
            )
            .setFooter({ text: 'Original JMusicBot by jagrosh' });

        await message.reply({ embeds: [embed] });
    },
};
