const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const economyService = require('../../services/economyService');
const { ECONOMY } = economyService;
const { coin, formatPercent, relativeTimestamp } = require('../../utils/format');
const { describeError } = require('../../utils/economyErrors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Intentás robarle monedas a otro miembro.')
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('Miembro al que querés robarle.')
            .setRequired(true)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', flags: [64] });
        }

        const target = interaction.options.getUser('usuario');

        if (target.bot) {
            return interaction.reply({ content: '❌ No podés robarle monedas a un bot.', flags: [64] });
        }

        if (!interaction.guild.members.cache.has(target.id)) {
            return interaction.reply({ content: '❌ Ese usuario no es miembro del servidor.', flags: [64] });
        }

        try {
            const result = await economyService.steal({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                targetId: target.id,
                reference: interaction.id
            });

            let embed;
            if (result.success) {
                embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle('🥷 Robo exitoso')
                    .setDescription(`Le robaste **${coin(result.amount)}** a <@${target.id}>.`)
                    .addFields(
                        { name: 'Tu saldo', value: `${coin(result.balance)}`, inline: true },
                        { name: 'Próximo intento', value: relativeTimestamp(result.availableAt), inline: true }
                    );
            } else {
                embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle('🚫 Robo fallido')
                    .setDescription(`No le pudiste robar monedas a <@${target.id}>.`)
                    .addFields(
                        { name: 'Multa', value: result.fine > 0 ? `-${coin(result.fine)}` : 'Sin multa', inline: true },
                        { name: 'Tu saldo', value: `${coin(result.balance)}`, inline: true },
                        { name: 'Próximo intento', value: relativeTimestamp(result.availableAt), inline: true }
                    );
            }

            embed.setFooter({ text: `Probabilidad de éxito: ${formatPercent(ECONOMY.steal.successRate)}` });

            return interaction.reply({ embeds: [embed], flags: [64] });
        } catch (err) {
            return interaction.reply({ content: `❌ ${describeError(err)}`, flags: [64] });
        }
    }
};
