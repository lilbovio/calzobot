const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Reporta un problema o usuario.')
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del reporte')
                .setRequired(true)),
    async execute(interaction) {
        const reason = interaction.options.getString('razon');
        const reportChannel = interaction.guild.channels.cache.get('1347852565542469694');

        if (!reportChannel) return interaction.reply({ content: 'Canal de reportes no encontrado.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('📢 Nuevo Reporte')
            .addFields(
                { name: 'Usuario:', value: interaction.user.tag, inline: true },
                { name: 'ID:', value: interaction.user.id, inline: true },
                { name: 'Razón:', value: reason }
            )
            .setColor('Red')
            .setTimestamp();

        reportChannel.send({ content: `<@848838967620403200>`, embeds: [embed] });
        interaction.reply({ content: '✅ Reporte enviado correctamente.'});
    }
};
