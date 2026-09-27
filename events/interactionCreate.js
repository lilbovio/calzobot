const config = require('../config.json');

// Discord corta la interaccion a los 3 s. Sin este registro no hay forma de
// saber si un comando no respondio porque se paso de tiempo o porque ni entro.
const SLOW_INTERACTION_MS = 1800;

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isAutocomplete()) {
            const autocompleteCommand = client.commands.get(interaction.commandName);
            if (autocompleteCommand && typeof autocompleteCommand.autocomplete === 'function') {
                try {
                    await autocompleteCommand.autocomplete(interaction, client);
                } catch (error) {
                    console.error('Error ejecutando autocomplete:', error);
                }
            }
            return;
        }

        // Solo slash commands
        if (!interaction.isChatInputCommand()) return;

        const startedAt = Date.now();
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`[interaccion] /${interaction.commandName} llego pero el comando no esta cargado.`);
            return;
        }

        try {
            if (typeof command.execute === 'function') {
                await command.execute(interaction, client);
            } else {
                await interaction.reply({ content: '\u2754 Comando no implementado correctamente.', ephemeral: true });
            }
            const elapsed = Date.now() - startedAt;
            // getSubcommand() lanza excepcion si el comando no tiene subcomandos.
            let sub = '';
            try {
                sub = ` ${interaction.options.getSubcommand()}`;
            } catch {
                sub = '';
            }
            if (elapsed > SLOW_INTERACTION_MS) {
                console.warn(`[interaccion] /${interaction.commandName}${sub} tardo ${elapsed}ms (limite 3000ms)`);
            } else {
                console.log(`[interaccion] /${interaction.commandName}${sub} respondio en ${elapsed}ms`);
            }
        } catch (error) {
            const elapsed = Date.now() - startedAt;
            console.error(`[interaccion] /${interaction.commandName} fallo tras ${elapsed}ms:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '\u274C Ocurri\u00F3 un error al ejecutar el comando.', ephemeral: true });
            } else {
                await interaction.reply({ content: '\u274C Ocurri\u00F3 un error al ejecutar el comando.', ephemeral: true });
            }
        }
    }
};
