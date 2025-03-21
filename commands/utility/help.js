const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📜 Lista de Comandos')
            .setColor('#0099ff')
            .setDescription('Aquí están los comandos disponibles en este bot.')
            .addFields(
                { name: '⚔️ Moderación', value: '`/jail`, `/warn`, `/seewarns`, `/free`, `/lock`' },
                { name: '🔧 Utilidad', value: '`/ping`, `/afk`, `/report`, `/setprefix`' }
            )
            .setFooter({ text: 'Usa /help [comando] para más detalles.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
