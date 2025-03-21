const { SlashCommandBuilder } = require('discord.js');
const Welcome = require('../../models/welcomeSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('📢 Configura el mensaje de bienvenida.')
        .addStringOption(option =>
            option.setName('canal')
                .setDescription('ID del canal donde se enviará la bienvenida.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('Texto del mensaje de bienvenida. Usa {usuario} para mencionar al nuevo miembro.')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('imagen')
                .setDescription('¿Incluir una imagen en la bienvenida?')),

    async execute(interaction) {
        const channelID = interaction.options.getString('canal');
        const messageText = interaction.options.getString('mensaje');
        const includeImage = interaction.options.getBoolean('imagen');

        await Welcome.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { channelId: channelID, message: messageText, image: includeImage },
            { upsert: true, new: true }
        );

        await interaction.reply(`✅ Mensaje de bienvenida configurado correctamente.`);
    }
};

