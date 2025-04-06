const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Jail = require('../../models/jailSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seejail')
        .setDescription('Muestra la información de un usuario en Jail.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que quieres consultar.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // 🔹 Defer para evitar timeout
            if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
                return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
            }
        
        const user = interaction.options.getUser('usuario');
        const jailData = await Jail.findOne({ userId: user.id, guildId: interaction.guild.id });

        if (!jailData) {
            return interaction.editReply({ content: '✅ Este usuario no está en Jail.' });
        }

        // Calcular tiempo restante
        const tiempoRestante = Math.max(0, Math.floor((jailData.liberacion - Date.now()) / 60000));

        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle('⛓ Estado de Jail')
            .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Razón:** ${jailData.razon}\n⏳ **Tiempo restante:** ${tiempoRestante} minutos`);

        await interaction.editReply({ embeds: [embed] }); // 🔹 Usar editReply en lugar de reply
    }
};
