const { Events } = require('discord.js');
const { ButtonStyle, MessageFlags } = require('discord-api-types/v10');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('@discordjs/builders')

module.exports = {
    name: Events.InteractionCreate,
    /**
    * @param {import('discord.js').ButtonInteraction} interaction
    */
    async execute(interaction) {
        if (!interaction.isButton()) {
            return;
        }
        
        const valueParts = interaction.customId.split("_");
        if (valueParts[0] == "ticket") {
            const value = valueParts[1];

            const guild = interaction.guild;
            const channel = interaction.channel;
            const user = interaction.user;

            if (value == "close") {
                if (!channel.deletable) {
                    return interaction.reply("No tengo permisos para borrar este canal, alerta a un administrador!")
                }
                
                const closeConfirmButtonComponent = new ButtonBuilder()
                    .setCustomId("ticket_closeConfirm")
                    .setLabel("Confirmar")
                    .setStyle(ButtonStyle.Danger);
                
                const closeCancelButtonComponent = new ButtonBuilder()
                    .setCustomId("ticket_closeCancel")
                    .setLabel("Cancelar")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(closeConfirmButtonComponent, closeCancelButtonComponent);

                interaction.reply({
                    content: "Estas seguro de que quieres cerrar el ticket?",
                    components: [ row ]
                })
            } 
            else if (value == "closeConfirm") {
                await interaction.reply("Cerrando ticket...");
                channel.delete();
            } 
            else if (value == "closeCancel") {
                interaction.reply({
                    content: "Continua con el ticket!",
                    flags: [MessageFlags.Ephemeral]
                });
                interaction.message.delete();
            } 
            else if (value == "claim") {
                interaction.reply("Aun en construcción...");
            }
        }
    }
}