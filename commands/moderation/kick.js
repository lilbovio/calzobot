const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms'); // Para manejar el tiempo en formato fácil (Ejemplo: "1h", "10m", "2d")
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor con opción de tiempo y borrado de mensajes.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario a banear.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del baneo.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('tiempo')
                .setDescription('Tiempo del baneo (Ejemplo: 10m, 1h, 2d).')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('borrar_mensajes')
                .setDescription('Cantidad de mensajes a eliminar (máximo 50).')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: '❌ No tienes permisos para banear usuarios.', ephemeral: true });
            }

            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            const reason = interaction.options.getString('razon') || 'No especificada';
            const timeInput = interaction.options.getString('tiempo');
            const deleteMessages = interaction.options.getInteger('borrar_mensajes') || 0;

            if (user.id === interaction.user.id) {
                return interaction.reply({ content: "❌ No puedes banearte a ti mismo.", ephemeral: true });
            }

            if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

            // Convertir tiempo de baneo a milisegundos (si se especificó)
            let banDuration = null;
            if (timeInput) {
                banDuration = ms(timeInput);
                if (!banDuration) {
                    return interaction.reply({ content: '❌ Formato de tiempo inválido. Usa ejemplos como `10m`, `1h`, `2d`.', ephemeral: true });
                }
            }

            // Ejecutar el baneo con la cantidad de mensajes a eliminar
            await member.ban({ reason, deleteMessageSeconds: deleteMessages * 60 });

            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔨 Usuario Baneado')
                .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Razón:** ${reason}\n🔹 **Duración:** ${banDuration ? timeInput : "Permanente"}\n🔹 **Mensajes eliminados:** ${deleteMessages}`)
                .setFooter({ text: 'El usuario ha sido baneado del servidor.' });

            interaction.reply({ embeds: [embed] });

            // Si hay una duración de baneo, programamos el desbaneo automático
            if (banDuration) {
                setTimeout(async () => {
                    await interaction.guild.members.unban(user.id, 'Baneo temporal expirado.');
                    const unbanEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🔓 Usuario Desbaneado')
                        .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Motivo:** Baneo temporal expirado.`)
                        .setFooter({ text: 'El usuario ha sido desbaneado automáticamente.' });

                    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) logChannel.send({ embeds: [unbanEmbed] });
                }, banDuration);
            }

        } catch (error) {
            interaction.client.emit("error", error);
            interaction.reply({ content: "⚠️ Ha ocurrido un error, los administradores han sido notificados.", ephemeral: true });
        }
    }
};
