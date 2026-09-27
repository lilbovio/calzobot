const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const economyService = require('../../services/economyService');
const { coin, relativeTimestamp } = require('../../utils/format');
const { describeError } = require('../../utils/economyErrors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabajás para ganar monedas.'),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', flags: [64] });
        }

        try {
            const result = await economyService.work({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                reference: interaction.id
            });

            const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('💼 Trabajo completado')
                .setDescription(`<@${interaction.user.id}>, ganaste **${coin(result.reward)}**.`)
                .addFields(
                    { name: 'Tu saldo', value: `${coin(result.balance)}`, inline: true },
                    { name: 'Próximo cobro', value: relativeTimestamp(result.availableAt), inline: true }
                );

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            return interaction.reply({ content: `❌ ${describeError(err)}`, flags: [64] });
        }
    }
};
