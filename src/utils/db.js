const Database = require('better-sqlite3');
const path = require('path');

// Il file del DB sarà salvato nella root o in un volume montato
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Inizializzazione tabelle
db.prepare(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT,
        dj_role_id TEXT,
        text_channel_id TEXT,
        voice_channel_id TEXT
    )
`).run();

module.exports = {
    getSettings: (guildId) => {
        const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
        return row || {};
    },
    
    setPrefix: (guildId, prefix) => {
        const current = module.exports.getSettings(guildId);
        if (current.guild_id) {
            db.prepare('UPDATE guild_settings SET prefix = ? WHERE guild_id = ?').run(prefix, guildId);
        } else {
            db.prepare('INSERT INTO guild_settings (guild_id, prefix) VALUES (?, ?)').run(guildId, prefix);
        }
    },

    setDJRole: (guildId, roleId) => {
        const current = module.exports.getSettings(guildId);
        if (current.guild_id) {
            db.prepare('UPDATE guild_settings SET dj_role_id = ? WHERE guild_id = ?').run(roleId, guildId);
        } else {
            db.prepare('INSERT INTO guild_settings (guild_id, dj_role_id) VALUES (?, ?)').run(guildId, roleId);
        }
    }
};
