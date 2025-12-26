require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./utils/db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');

if (!fs.existsSync(foldersPath)) {
    fs.mkdirSync(foldersPath);
}

const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (fs.statSync(commandsPath).isDirectory()) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Loaded ${client.commands.size} commands.`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Recupera impostazioni dal DB
    const settings = db.getSettings(message.guild?.id);
    
    let prefix = settings.prefix || process.env.PREFIX;
    const altPrefix = process.env.ALT_PREFIX;
    const botMention = `<@${client.user.id}>`;
    
    let usedPrefix = null;

    if (prefix === '@mention') {
        if (message.content.startsWith(botMention)) {
            usedPrefix = botMention;
        } else if (message.content.startsWith(`<@!${client.user.id}>`)) {
            usedPrefix = `<@!${client.user.id}>`;
        }
    } else if (prefix && message.content.startsWith(prefix)) {
        usedPrefix = prefix;
    }

    if (!usedPrefix && altPrefix && message.content.startsWith(altPrefix)) {
        usedPrefix = altPrefix;
    }

    if (!usedPrefix) return;

    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
