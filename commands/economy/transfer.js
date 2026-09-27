const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const economyService = require('../../services/economyService');
const { coin } = require('../../utils/format');
const { describeError } = require('../../utils/economyErrors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transferir monedas a otro miembro.')
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('Miembro al que querés darle monedas.')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('monto')
            .setDescription('Cantidad de monedas a transferir.')
            .setMinValue(1)
            .setRequired(true)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', flags: [64] });
        }

        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('monto');

        if (target.bot) {
            return interaction.reply({ content: '❌ No podés transferirle monedas a un bot.', flags: [64] });
        }

        if (!interaction.guild.members.cache.has(target.id)) {
            return interaction.reply({ content: '❌ Ese usuario no es miembro del servidor.', flags: [64] });
        }

        try {
            const result = await economyService.transfer({
                guildId: interaction.guildId,
                fromUserId: interaction.user.id,
                toUserId: target.id,
                amount,
                reference: interaction.id
            });

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('💸 Transferencia')
                .setDescription(`<@${interaction.user.id}> le envió **${coin(amount)}** a <@${target.id}>.`)
                .addFields(
                    { name: 'Tu saldo', value: `${coin(result.fromBalance)}`, inline: true },
                    { name: `Saldo de ${target.username}`, value: `${coin(result.toBalance)}`, inline: true }
                );

            return interaction.reply({ embeds: [embed], flags: [64] });
        } catch (err) {
            return interaction.reply({ content: `❌ ${describeError(err)}`, flags: [64] });
        }
    }
};
