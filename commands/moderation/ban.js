const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario a banear.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del baneo.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('BAN_MEMBERS')) {
                return interaction.reply({ content: '❌ No tienes permisos para banear usuarios.', ephemeral: true });
            }
            if (user.id === interaction.user.id) {
                return interaction.reply({ content: "❌ No puedes banearte a ti mismo.", ephemeral: true });
            }
    
            const user = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(user.id);
            const reason = interaction.options.getString('razon') || 'No especificada';
    
            if (!member) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    
            await member.ban({ reason });
    
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔨 Usuario Baneado')
                .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Razón:** ${reason}`)
                .setFooter({ text: 'El usuario ha sido baneado del servidor.' });
    
            interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            client.emit("error", error);
            interaction.reply({ content: "⚠️ Ha ocurrido un error, los administradores han sido notificados."});
        }
    }
};
