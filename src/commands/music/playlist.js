const fs = require('fs');
const path = require('path');

module.exports = {
    data: {
        name: 'playlist',
        description: 'Manage playlists (make, delete, append, list)',
        aliases: ['pl']
    },
    async execute(message, args) {
        const playlistsFolder = process.env.PLAYLISTS_FOLDER || 'Playlists';
        const folderPath = path.join(process.cwd(), playlistsFolder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        if (!args.length) {
            return message.reply('Usage: `playlist <make|delete|append|defaults|all> <name> [url]`');
        }

        const subCommand = args[0].toLowerCase();
        const playlistName = args[1];

        if (subCommand === 'make' || subCommand === 'create') {
            if (!playlistName) return message.reply('Please provide a name for the playlist!');
            const filePath = path.join(folderPath, `${playlistName}.txt`);
            if (fs.existsSync(filePath)) {
                return message.reply(`Playlist **${playlistName}** already exists!`);
            }
            fs.writeFileSync(filePath, '');
            return message.reply(`Playlist **${playlistName}** created!`);

        } else if (subCommand === 'delete' || subCommand === 'remove') {
            if (!playlistName) return message.reply('Please provide a name for the playlist!');
            const filePath = path.join(folderPath, `${playlistName}.txt`);
            if (!fs.existsSync(filePath)) {
                return message.reply(`Playlist **${playlistName}** does not exist!`);
            }
            fs.unlinkSync(filePath);
            return message.reply(`Playlist **${playlistName}** deleted!`);

        } else if (subCommand === 'append' || subCommand === 'add') {
            if (!playlistName) return message.reply('Please provide a name for the playlist!');
            const url = args.slice(2).join(' ');
            if (!url) return message.reply('Please provide a URL or query to add!');
            
            const filePath = path.join(folderPath, `${playlistName}.txt`);
            if (!fs.existsSync(filePath)) {
                return message.reply(`Playlist **${playlistName}** does not exist!`);
            }
            
            fs.appendFileSync(filePath, `${url}\n`);
            return message.reply(`Added track to playlist **${playlistName}**!`);
            
        } else if (subCommand === 'list' || subCommand === 'show') {
             if (!playlistName) return message.reply('Please provide a name for the playlist!');
             const filePath = path.join(folderPath, `${playlistName}.txt`);
             if (!fs.existsSync(filePath)) {
                return message.reply(`Playlist **${playlistName}** does not exist!`);
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length === 0) return message.reply(`Playlist **${playlistName}** is empty.`);
            
            // Mostra solo le prime 20 righe per evitare spam
            const preview = lines.slice(0, 20).map((l, i) => `${i+1}. ${l}`).join('\n');
            return message.reply(`**${playlistName}** (${lines.length} tracks):\n${preview}${lines.length > 20 ? '\n...' : ''}`);

        } else {
            return message.reply('Unknown subcommand. Use `make`, `delete`, `append`, `list`.');
        }
    },
};
