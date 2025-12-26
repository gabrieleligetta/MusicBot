const permissions = require('../../utils/permissions');
const db = require('../../utils/db');

module.exports = {
    data: {
        name: 'prefix',
        description: 'Sets the bot prefix for this server',
        aliases: ['setprefix']
    },
    async execute(message, args) {
        if (!permissions.checkAdmin(message)) return;

        const settings = db.getSettings(message.guild.id);
        const currentPrefix = settings.prefix || process.env.PREFIX || '@mention';

        if (!args.length) {
            return message.reply(`The current prefix is \`${currentPrefix}\``);
        }

        const newPrefix = args[0];
        
        if (newPrefix.toLowerCase() === 'none') {
             // Reset to default
             db.setPrefix(message.guild.id, null);
             return message.reply(`Prefix reset to default.`);
        }

        db.setPrefix(message.guild.id, newPrefix);
        message.reply(`✅ Prefix set to \`${newPrefix}\``);
    },
};
