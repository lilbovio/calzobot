const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Desbloquea el canal actual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
        await interaction.reply('🔓 Canal desbloqueado.');
    }
};

