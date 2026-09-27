const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prefixService = require('../../services/prefixService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles.'),

    async execute(interaction) {
        const prefix = prefixService.getPrefixes(interaction.guildId)[0];

        const embed = new EmbedBuilder()
            .setTitle('📜 Lista de Comandos')
            .setColor('#0099ff')
            .setDescription('Todos los comandos funcionan como slash command y con prefijo.')
            .addFields(
                { name: '⚔️ Moderación', value: '`/jail`, `/warn`, `/seewarns`, `/free`, `/lock`, `/setprefix`' },
                { name: '🔧 Utilidad', value: '`/ping`, `/afk`, `/report`, `/botinfo`' },
                { name: '💰 Economía', value: '`/balance [usuario]`, `/work`, `/steal [usuario]`, `/transfer [usuario] [monto]`' },
                { name: '🎲 Apuestas', value: '`/bet create`, `/bet list`, `/bet view`, `/bet wager`, staff: `/bet close`, `/bet resolve`, `/bet cancel`' }
            )
            .setFooter({ text: `Con prefijo: ${prefix}help   •   Ejemplos: ${prefix}work, ${prefix}bet wager A1B2C3 o1 500` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
