const config = require('../config.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Solo slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            if (typeof command.execute === 'function') {
                await command.execute(interaction, client);
            } else {
                await interaction.reply({ content: '❔ Comando no implementado correctamente.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error ejecutando slash command:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true });
            }
        }
    }
};
