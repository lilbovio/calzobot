const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_auditory_channel')
        .setDescription('Estable el canal en el que se enviaran los registros de auditoria.'),
    
        async execute(interaction) {
            
        interaction.reply(`🏓 No disponible: Aun en construcción...`);
    }
};
