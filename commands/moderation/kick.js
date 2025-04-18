const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario a expulsar.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la expulsión.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('borrar_mensajes')
                .setDescription('Cantidad de mensajes a eliminar (máximo 50).')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ content: '❌ No tienes permisos para expulsar usuarios.', ephemeral: true });
            }

            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            const reason = interaction.options.getString('razon') || 'No especificada';
            const deleteMessages = interaction.options.getInteger('borrar_mensajes') || 0;

            if (user.id === interaction.user.id) {
                return interaction.reply({ content: "❌ No puedes expulsarte a ti mismo.", ephemeral: true });
            }

            if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

            // Borrar mensajes si se especifica
            if (deleteMessages > 0) {
                const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
                const userMessages = fetchedMessages.filter(msg => msg.author.id === user.id).first(deleteMessages);
                await interaction.channel.bulkDelete(userMessages, true);
            }

            // Expulsar al usuario
            await member.kick(reason);

            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('🚪 Usuario Expulsado')
                .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Razón:** ${reason}\n🔹 **Mensajes eliminados:** ${deleteMessages}`)
                .setFooter({ text: 'El usuario ha sido expulsado del servidor.' });

            interaction.reply({ embeds: [embed] });

        } catch (error) {
            interaction.client.emit("error", error);
            interaction.reply({ content: "⚠️ Ha ocurrido un error, los administradores han sido notificados.", ephemeral: true });
        }
    }
};

