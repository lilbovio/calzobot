const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

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
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has('KICK_MEMBERS')) {
            return interaction.reply({ content: '❌ No tienes permisos para banear usuarios.', ephemeral: true });
        }
        if (user.id === interaction.user.id) {
            return interaction.reply({ content: "❌ No puedes kickearte a ti mismo.", ephemeral: true });
        }

        const user = interaction.options.getUser('usuario');
        const member = interaction.guild.members.cache.get(user.id);
        const reason = interaction.options.getString('razon') || 'No especificada';

        if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('🚪 Usuario Expulsado')
            .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Razón:** ${reason}`)
            .setFooter({ text: 'El usuario ha sido expulsado del servidor.' });

        interaction.reply({ embeds: [embed] });
    }
};
