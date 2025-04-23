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
                const channel = interaction.channel;
                const member = interaction.member;

                const modRolesIds = [ ...require('../config.json').MOD_ROLES ];

                if (!modRolesIds.some(role => 
                    member.roles.cache.has(role)
                )) {
                    return interaction.reply({
                        content: "Solo un miembro del staff puede usar este botón!\n||Si eres parte del staff y no puedes usarlo, alerta a un administrador!||",
                        flags: MessageFlags.Ephemeral
                    });
                }

                await channel.permissionOverwrites.edit(user.id, {SendMessages: true });


                const modRolesIdsUnknown = [];
                for (let i = 0; i < modRolesIds.length; i++) {
                    try {
                        await channel.permissionOverwrites.edit(modRolesIds[i], { SendMessages: false });
                    } catch(e) {
                        modRolesIdsUnknown.push(modRolesIds[i])
                    }
                }

                console.warn("Supplied parameter is not a User nor a Role: " + modRolesIdsUnknown.toString());

                const newButtons = [
                    new ButtonBuilder({
                        custom_id: 'ticket_claim',
                        style: ButtonStyle.Secondary,
                        label: "Reclamado por " + user.username + "!"
                    }).setDisabled(true),
                    new ButtonBuilder({
                        custom_id: 'ticket_close',
                        style: ButtonStyle.Danger,
                        label: 'Cerrar'
                    })
                ]

                const row = new ActionRowBuilder();
                row.addComponents(newButtons);

                interaction.update({
                    content: interaction.message.content,
                    components: [ row ]
                })
            }
        }
    }
}