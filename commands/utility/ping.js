const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra el ping del bot.'),
    async execute(interaction) {
        const ping = interaction.client.ws.ping;
        interaction.reply(`🏓 Pong! Latencia: **${ping}ms**`);
    }
};
