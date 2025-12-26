const util = require('util');

module.exports = {
    data: {
        name: 'eval',
        description: 'Evaluates arbitrary JavaScript code',
        aliases: []
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        if (!args.length) return message.reply('Please provide code to evaluate!');

        const code = args.join(' ');

        try {
            let evaled = eval(code);

            if (typeof evaled !== 'string') {
                evaled = util.inspect(evaled);
            }

            // Limita la lunghezza del messaggio
            if (evaled.length > 1900) {
                evaled = evaled.slice(0, 1900) + '...';
            }

            message.channel.send(`\`\`\`js\n${evaled}\n\`\`\``);
        } catch (err) {
            message.channel.send(`\`ERROR\` \`\`\`xl\n${err}\n\`\`\``);
        }
    },
};
