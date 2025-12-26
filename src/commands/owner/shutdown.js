const permissions = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'shutdown',
        description: 'Shuts down the bot',
        aliases: ['restart'] // Spesso usato in docker per riavviare
    },
    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('🚫 Only the **Bot Owner** can use this command!');
        }

        await message.reply('👋 Shutting down...');
        
        // Chiudi connessioni database se necessario
        // db.close(); 
        
        process.exit(0);
    },
};
