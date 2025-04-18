const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Jail = require('../../models/jailSchema');
const config = require('../../config.json');

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

        // 🔹 Calcular tiempo restante
        const msRestantes = jailData.liberacion - Date.now();
        let tiempoFormateado = '';

        if (msRestantes <= 0) {
            tiempoFormateado = 'Ya debería estar libre';
        } else {
            const minutos = Math.floor((msRestantes / (1000 * 60)) % 60);
            const horas = Math.floor((msRestantes / (1000 * 60 * 60)) % 24);
            const dias = Math.floor(msRestantes / (1000 * 60 * 60 * 24));
            tiempoFormateado = `${dias > 0 ? `${dias}d ` : ''}${horas > 0 ? `${horas}h ` : ''}${minutos}m`;
        }

        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle('⛓ Estado de Jail')
            .setDescription(`🔹 **Usuario:** <@${user.id}>
🔹 **Razón:** ${jailData.razon}
⏳ **Tiempo restante:** ${tiempoFormateado}
🔁 **Veces en Jail:** ${jailData.timesJailed}`);

        await interaction.editReply({ embeds: [embed] });
    }
};
