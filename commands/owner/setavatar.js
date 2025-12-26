module.exports = {
    data: {
        name: 'setavatar',
        description: 'Sets the bot\'s avatar',
        aliases: ['avatar']
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        let url;
        if (message.attachments.size > 0) {
            url = message.attachments.first().url;
        } else if (args.length > 0) {
            url = args[0];
        } else {
            return message.reply('Please provide an image attachment or a URL!');
        }

        try {
            await message.client.user.setAvatar(url);
            message.reply('✅ Avatar changed successfully!');
        } catch (error) {
            console.error(error);
            message.reply(`❌ Failed to change avatar: ${error.message}`);
        }
    },
};
