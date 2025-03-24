const { SlashCommandBuilder } = require('@discordjs/builders');

const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_auditory_channel')
        .setDescription('Establece el canal en el que se enviaran los registros de auditoria.')
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal donde se enviaran los registros de auditoria")
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const oldConfig = require("../../config.json");

        console.log(oldConfig)
        oldConfig.AUDITORY_CHANNEL_ID = interaction.options.getChannel("canal").id;

        const newJsonConfig = JSON.stringify(oldConfig, null, 4);

        console.log(oldConfig)
        console.log(newJsonConfig)

        try {
            fs.writeFileSync('../../config.json', newJsonConfig, 'utf8');
        } catch(e) {
            console.error(e + "\nNo se pudo actualizar el archivo de configuración!");
            await interaction.reply("No se pudo cambiar el canal para los logs");
            return;
        }
        await interaction.reply("🏓 Configuración actualizada!");
    }
};
