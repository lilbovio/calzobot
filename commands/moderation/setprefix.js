const { SlashCommandBuilder } = require('@discordjs/builders');
const PrefixSchema = require('../../models/prefixSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Cambia el prefijo del bot.')
        .addStringOption(option =>
            option.setName('prefijo')
                .setDescription('Nuevo prefijo')
                .setRequired(true)),
    async execute(interaction) {
        const newPrefix = interaction.options.getString('prefijo');

        await PrefixSchema.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { prefix: newPrefix },
            { upsert: true }
        );

        interaction.reply(`✅ El prefijo ha sido cambiado a: \`${newPrefix}\``);
    }
};
