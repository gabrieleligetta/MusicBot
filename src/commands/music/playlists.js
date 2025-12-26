const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'playlists',
        description: 'Shows available playlists',
        aliases: ['pls']
    },
    async execute(message, args) {
        const playlistsFolder = process.env.PLAYLISTS_FOLDER || 'Playlists';
        const folderPath = path.join(process.cwd(), playlistsFolder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            return message.reply('No playlists found (folder created).');
        }

        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.txt'));

        if (files.length === 0) {
            return message.reply('No playlists found.');
        }

        const playlistNames = files.map(file => `\`${file.replace('.txt', '')}\``).join(', ');
        await message.reply(`📂 **Available Playlists:**\n${playlistNames}`);
    },
};
