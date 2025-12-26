module.exports = {
    data: {
        name: 'setname',
        description: 'Sets the bot\'s username',
        aliases: ['name']
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        if (!args.length) {
            return message.reply('Please provide a new username!');
        }

        const newName = args.join(' ');
        try {
            await message.client.user.setUsername(newName);
            message.reply(`✅ Username changed to **${newName}**`);
        } catch (error) {
            console.error(error);
            message.reply(`❌ Failed to change username: ${error.message}`);
        }
    },
};
