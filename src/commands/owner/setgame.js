const { ActivityType } = require('discord.js');

module.exports = {
    data: {
        name: 'setgame',
        description: 'Sets the bot\'s activity',
        aliases: ['game']
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        if (!args.length) {
            message.client.user.setActivity(null);
            return message.reply('Activity cleared.');
        }

        const activity = args.join(' ');
        // Default to Playing, could be enhanced to support Listening/Watching based on keywords
        message.client.user.setActivity(activity, { type: ActivityType.Playing });
        message.reply(`✅ Activity set to **Playing ${activity}**`);
    },
};
