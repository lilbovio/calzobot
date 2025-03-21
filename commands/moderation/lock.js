const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 Bloquea el canal actual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
        await interaction.reply('🔒 Canal bloqueado.');
    }
};
