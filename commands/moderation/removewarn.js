const { SlashCommandBuilder } = require('@discordjs/builders');
const WarnSchema = require('../../models/warnSchema');
const config = require('../../config.json');

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

        // Permisos
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando." });
        }

        const warns = await WarnSchema.find({ userId: user.id, guildId: interaction.guild.id });
        console.log(`📋 Warns encontrados para ${user.tag} en este servidor:`, warns);

        if (!warns[warnIndex]) {
            return interaction.reply({ content: '⚠️ Número de warn inválido.' });
        }

        const warnToDelete = warns[warnIndex];
        console.log(`🗑️ Eliminando warn con ID: ${warnToDelete._id}`);

        try {
            const result = await WarnSchema.findByIdAndDelete(warnToDelete._id);
            console.log(`✅ Resultado de eliminación:`, result);

            if (!result) {
                return interaction.reply({ content: `⚠️ No se encontró el warn en la base de datos. Puede que ya haya sido eliminado.` });
            }

            interaction.reply(`✅ Se eliminó el warn **#${warnIndex + 1}** de ${user}.`);
        } catch (error) {
            console.error('❌ Error al eliminar warn:', error);
            interaction.reply({ content: '❌ Ocurrió un error al intentar eliminar el warn.' });
        }
    }
};