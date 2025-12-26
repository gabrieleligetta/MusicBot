const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'settings',
        description: 'Shows the bot settings',
        aliases: ['status']
    },
    async execute(message, args) {
        // TODO: Implementare un vero sistema di gestione impostazioni per gilda (DB o JSON)
        // Per ora usiamo valori di default/placeholder come nel codice Java originale
        
        const settings = {
            textChannel: null,
            voiceChannel: null,
            djRole: null,
            prefix: process.env.PREFIX || null,
            repeatMode: 'OFF',
            queueType: 'FAIR',
            defaultPlaylist: null
        };

        const embed = new EmbedBuilder()
            .setColor(message.guild.members.me.displayColor)
            .setDescription(
                `Text Channel: ${settings.textChannel ? `**#${settings.textChannel}**` : 'Any'}\n` +
                `Voice Channel: ${settings.voiceChannel ? settings.voiceChannel : 'Any'}\n` +
                `DJ Role: ${settings.djRole ? `**${settings.djRole}**` : 'None'}\n` +
                `Custom Prefix: ${settings.prefix ? `\`${settings.prefix}\`` : 'None'}\n` +
                `Repeat Mode: ${settings.repeatMode}\n` +
                `Queue Type: ${settings.queueType}\n` +
                `Default Playlist: ${settings.defaultPlaylist ? `**${settings.defaultPlaylist}**` : 'None'}`
            )
            .setFooter({ 
                text: `${message.client.guilds.cache.size} servers | ${message.client.voice?.adapters?.size || 0} audio connections` 
            });

        await message.channel.send({ 
            content: `🎧 **${message.client.user.username}** settings:`,
            embeds: [embed] 
        });
    },
};
