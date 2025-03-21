const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Warn = require('../../models/warnSchema');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario y guarda el warn en la base de datos.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario al que deseas advertir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la advertencia.')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');
        if (user.id === interaction.user.id) {
            return interaction.reply({ content: "❌ No puedes warnearte a ti mismo.", ephemeral: true });
        }
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando."});
        }

        try {
            await Warn.create({
                userId: user.id,
                guildId: interaction.guild.id,
                reason,
                moderatorId: interaction.user.id,
                timestamp: Date.now()
            });

            // Embed para el canal (sin modificaciones)
            const embed = new EmbedBuilder()
                .setColor(0xffcc00) // Amarillo
                .setTitle('⚠️ Advertencia Emitida')
                .setDescription(`El usuario ${user} ha sido advertido.`)
                .addFields(
                    { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📌 Razón', value: reason, inline: true },
                    { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                )
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: 'Sistema de advertencias', iconURL: interaction.client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });

            // **Mensaje privado al usuario**
            const dmEmbed = new EmbedBuilder()
                .setColor(0xffcc00)
                .setTitle('⚠️ Has recibido una advertencia')
                .setDescription(`Has sido advertido en **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📌 Razón', value: reason, inline: true },
                    { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                )
                .setFooter({ text: 'Por favor, respeta las reglas del servidor.' });

            await user.send({ embeds: [dmEmbed] }).catch(() => {
                console.log(`No se pudo enviar DM a ${user.tag}.`);
            });

        } catch (error) {
            console.error('Error al emitir advertencia:', error);
            await interaction.reply({ content: '❌ Hubo un error al registrar la advertencia.', ephemeral: true });
        }
    }
};
