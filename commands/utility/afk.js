const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const afkService = require('../../services/afkService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Ponerse en estado AFK.')
        .addStringOption(option => option
            .setName('razon')
            .setDescription('Razón de por qué estás AFK.')
            .setMaxLength(300)
            .setRequired(false)),

    async execute(interaction) {
        const reason = (interaction.options.getString('razon') || 'Sin razón').slice(0, 300);
        await afkService.set(interaction.user.id, reason);

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('🛌 Modo AFK activado')
            .setDescription(`Tu estado AFK ha sido activado.\n**Razón:** ${reason}`)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
