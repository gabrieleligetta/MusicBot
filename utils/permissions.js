const { PermissionsBitField } = require('discord.js');

module.exports = {
    isAdmin: (member) => {
        return member.permissions.has(PermissionsBitField.Flags.ManageGuild) || 
               member.permissions.has(PermissionsBitField.Flags.Administrator) ||
               member.id === process.env.OWNER_ID;
    },
    
    isDJ: (member) => {
        if (module.exports.isAdmin(member)) return true;
        
        // Cerca un ruolo chiamato "DJ"
        const djRole = member.roles.cache.find(role => role.name.toLowerCase() === 'dj');
        if (djRole) return true;
        
        // TODO: Implementare controllo ruolo DJ configurato nel DB
        
        return false;
    },
    
    checkDJ: (message) => {
        if (!module.exports.isDJ(message.member)) {
            message.reply('🚫 You need to be a **DJ** or **Admin** to use this command!');
            return false;
        }
        return true;
    },

    checkAdmin: (message) => {
        if (!module.exports.isAdmin(message.member)) {
            message.reply('🚫 You need to be an **Admin** to use this command!');
            return false;
        }
        return true;
    }
};
