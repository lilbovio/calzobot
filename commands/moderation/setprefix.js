const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const prefixService = require('../../services/prefixService');
const { isStaff } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Cambia el prefijo del bot en este servidor.')
        .addStringOption(option => option
            .setName('prefijo')
            .setDescription('Nuevo prefijo, de 1 a 5 caracteres.')
            .setMinLength(1)
            .setMaxLength(5)
            .setRequired(true)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', ephemeral: true });
        }

        if (!isStaff(interaction)) {
            return interaction.reply({ content: '❌ Necesitás tener un rol de staff para cambiar el prefijo.', flags: [64] });
        }

        const requested = interaction.options.getString('prefijo');
        const { value, error } = prefixService.validatePrefix(requested);
        if (error) {
            return interaction.reply({ content: `❌ ${error}`, flags: [64] });
        }

        await prefixService.setPrefix(interaction.guildId, value);

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Prefijo actualizado')
            .setDescription(`A partir de ahora los comandos por texto usan \`${value}\`.\nEjemplo: \`${value}help\``);

        return interaction.reply({ embeds: [embed], flags: [64] });
    }
};
