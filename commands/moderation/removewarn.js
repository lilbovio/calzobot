const { SlashCommandBuilder } = require('@discordjs/builders');
const WarnSchema = require('../../models/warnSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removewarn')
        .setDescription('Elimina un warn de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario cuyo warn será eliminado')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('Número del warn a eliminar')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const warnIndex = interaction.options.getInteger('numero') - 1;
        const warns = await WarnSchema.find({ userId: user.id });

        if (!warns[warnIndex]) return interaction.reply({ content: 'Número de warn inválido.', ephemeral: true });

        await WarnSchema.findByIdAndDelete(warns[warnIndex]._id);
        interaction.reply(`Se eliminó el warn **#${warnIndex + 1}** de ${user}.`);
    }
};
