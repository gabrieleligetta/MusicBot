const { PresenceUpdateStatus } = require('discord.js');

module.exports = {
    data: {
        name: 'setstatus',
        description: 'Sets the bot\'s status (online, idle, dnd, invisible)',
        aliases: []
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        if (!args.length) {
            return message.reply('Please provide a status: `online`, `idle`, `dnd`, `invisible`');
        }

        const status = args[0].toLowerCase();
        const validStatuses = ['online', 'idle', 'dnd', 'invisible'];

        if (!validStatuses.includes(status)) {
            return message.reply('Invalid status! Use: `online`, `idle`, `dnd`, `invisible`');
        }

        message.client.user.setStatus(status);
        message.reply(`✅ Status set to **${status}**`);
    },
};
