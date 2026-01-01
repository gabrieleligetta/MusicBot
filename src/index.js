require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, version: djsVersion } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const db = require('./utils/db');
const logger = require('./utils/logger');
const player = require('./utils/player');
const packageJson = require('../package.json');

// --- DIAGNOSTICA AMBIENTE DOCKER ---
const sodium = (() => {
    try { return require('sodium-native'); }
    catch (e) { return null; }
})();
const crypto = require('node:crypto');

console.log('--- DIAGNOSTICA AMBIENTE DOCKER ---');
console.log(`Bot Version: v${packageJson.version}`);
console.log(`Node Version: ${process.version}`);
console.log(`Discord.js Version: v${djsVersion}`);
console.log(`Sodium-Native Caricato: ${sodium ? 'SÌ' : 'NO'}`);
if (!sodium) console.warn('ATTENZIONE: sodium-native non trovato. XChaCha20 non disponibile.');

const ciphers = crypto.getCiphers();
const hasAesGcm = ciphers.includes('aes-256-gcm');
console.log(`Supporto Node Crypto AES-256-GCM: ${hasAesGcm ? 'SÌ' : 'NO'}`);

if (!sodium && !hasAesGcm) {
    console.error('CRITICO: Nessuna modalità crittografica supportata disponibile!');
}
console.log('-----------------------------------');
// -----------------------------------

// Stampa report dipendenze vocali per debug all'avvio
logger.info('Voice Dependency Report:\n' + generateDependencyReport());

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
                logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

client.once(Events.ClientReady, () => {
    logger.info(`Logged in as ${client.user.tag}!`);
    logger.info(`Loaded ${client.commands.size} commands.`);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    // Ignora se il bot non è coinvolto o se non è in un canale
    const guildId = oldState.guild.id;
    const queue = player.getQueue(guildId);
    
    if (!queue || !queue.connection) return;

    // Ottieni il canale vocale dove si trova il bot
    const botChannelId = queue.connection.joinConfig.channelId;
    const botChannel = oldState.guild.channels.cache.get(botChannelId);

    if (!botChannel) return;

    // Conta i membri umani nel canale
    const humanMembers = botChannel.members.filter(member => !member.user.bot);

    if (humanMembers.size === 0) {
        // Se non ci sono umani, avvia il timer se non è già attivo
        if (!queue.autoleaveTimer) {
            logger.info(`[AutoLeave] Channel empty in guild ${guildId}. Starting 60s timer.`);
            queue.autoleaveTimer = setTimeout(() => {
                logger.info(`[AutoLeave] Timer expired for guild ${guildId}. Leaving channel.`);
                if (queue.connection) {
                    queue.connection.destroy();
                }
                player.deleteQueue(guildId);
            }, 60000); // 60 secondi
        }
    } else {
        // Se c'è almeno un umano, cancella il timer se esiste
        if (queue.autoleaveTimer) {
            logger.info(`[AutoLeave] Human detected in guild ${guildId}. Cancelling timer.`);
            clearTimeout(queue.autoleaveTimer);
            queue.autoleaveTimer = null;
        }
    }
});

client.on(Events.MessageCreate, async message => {
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
        logger.error(`Error executing command ${commandName}`, error);
        await message.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
