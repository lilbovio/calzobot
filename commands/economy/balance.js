const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const economyService = require('../../services/economyService');
const { coin, relativeTimestamp } = require('../../utils/format');
const { describeError } = require('../../utils/economyErrors');

function cooldownValue(target) {
    if (!target) return 'Ahora';
    return new Date(target).getTime() > Date.now() ? relativeTimestamp(target) : 'Ahora';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Muestra tu saldo de monedas o el de otro miembro.')
        .addUserOption(option => option
            .setName('usuario')
            .setDescription('Miembro cuyo saldo querés ver.')
            .setRequired(false)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', flags: [64] });
        }

        const target = interaction.options.getUser('usuario') || interaction.user;
        const self = target.id === interaction.user.id;

        try {
            const wallet = await economyService.getCooldowns(interaction.guildId, target.id);

            const embed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setTitle('Balance')
                .setDescription(self ? 'Este es tu saldo actual.' : `Saldo de <@${target.id}>.`)
                .addFields(
                    { name: 'Usuario', value: `${target} (\`${target.id}\`)`, inline: true },
                    { name: 'Saldo', value: `${coin(wallet.balance)}`, inline: true }
                )
                .setFooter({ text: 'Las monedas no tienen valor real ni se pueden comprar.' });

            if (self) {
                embed.addFields(
                    { name: 'Próximo /work', value: cooldownValue(wallet.workAvailableAt), inline: true },
                    { name: 'Próximo /steal', value: cooldownValue(wallet.stealAvailableAt), inline: true }
                );
            }

            return interaction.reply({ embeds: [embed], flags: [64] });
        } catch (err) {
            return interaction.reply({ content: `❌ ${describeError(err)}`, flags: [64] });
        }
    }
};
