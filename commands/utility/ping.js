const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra el ping del bot'),
    async execute(interaction, client) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        await interaction.editReply(`Pong! 🏓 ${client.ws.ping}ms`);
    },
    async executeMessage(message, args, client) {
        const m = await message.channel.send('Pinging...');
        await m.edit(`Pong! 🏓 ${client.ws.ping}ms`);
    },
    aliases: ['p']
};
