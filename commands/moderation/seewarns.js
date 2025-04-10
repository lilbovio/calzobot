const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Warn = require('../../models/warnSchema');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seewarns')
        .setDescription('Muestra las advertencias de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario del que deseas ver las advertencias.')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
            }

        // Buscar warns en la base de datos
        const warns = await Warn.find({ userId: user.id, guildId: interaction.guild.id });

        if (!warns.length) {
            return interaction.reply({ content: `✅ ${user} no tiene advertencias.`, ephemeral: true });
        }

        // Construcción del embed
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('📌 Warns de ' + user.username)
            .setDescription(`Lista de advertencias para ${user}:`)
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'Sistema de advertencias', iconURL: interaction.client.user.displayAvatarURL() });

        warns.forEach((warn, index) => {
            embed.addFields({
                name: `🔹 ${index + 1}. ${warn.reason}`,
                value: `👮 **Moderador:** <@${warn.moderatorId || 'Desconocido'}>  
                        📅 **Fecha:** <t:${Math.floor((warn.timestamp || Date.now()) / 1000)}:F>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
};
