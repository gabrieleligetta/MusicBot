module.exports = {
    data: {
        name: 'ping',
        description: 'Checks the bot\'s latency',
    },
    async execute(message, args) {
        const sent = await message.reply('Pinging...');
        const timeDiff = sent.createdTimestamp - message.createdTimestamp;
        const websocketPing = message.client.ws.ping;
        
        await sent.edit(`Ping: ${timeDiff}ms | Websocket: ${websocketPing}ms`);
    },
};
