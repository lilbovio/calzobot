const { Events, ChannelType } = require('discord.js');
const { PermissionFlagsBits, ButtonStyle, MessageFlags } = require('discord-api-types/v10');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('@discordjs/builders')

module.exports = {
    name: Events.InteractionCreate,
    /**
    * @param {import('discord.js').StringSelectMenuInteraction} interaction
    */
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) {
            return;
        }
        
        const valueParts = interaction.values[0].split("_");
        if (valueParts[0] == "ticket") {
            const value = valueParts[1];

            const guild = interaction.guild;
            const user = interaction.user;

            const ticket = guild.channels.cache.find(channel =>
                channel.name.toLowerCase().includes(value + "-" + user.username.toLowerCase())
            ); // Busca un ticket del usuario y del mismo tipo
              

            if (ticket) {
                return interaction.reply({
                    content: "Ya tienes un ticket abierto en " + ticket.toString(),
                    flags: [ MessageFlags.Ephemeral ]
                });
            }
    
            const category = guild.channels.cache.get(require("../config.json").TICKETS_CATEGORY_ID);
    
            const channelMembers = [];
    
            const channelMembersIds = require('../config.json').MOD_ROLES; // Se agregan los roles del staff
            channelMembersIds.push(user.id); // Se agrega al usuario
    
            for (let i = 0; i < (channelMembersIds.length); i++) {
    
                if (!(guild.roles.cache.get(channelMembersIds[i])) // > Si el rol no es accesible
                    && // --------------------------------------------> y
                    (i !== channelMembersIds.length-1) // ------------> Si aun no llegamos al usuario, el cual siempre esta al final
                ) {
                    continue; // -------------------------------------> Entonces omitimos la id
                }
                channelMembers.push({
                    id: channelMembersIds[i],
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.SendVoiceMessages,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.UseApplicationCommands
                    ]
                });
            }
    
            channelMembers.push({
                id: guild.roles.everyone.id,
                deny: [
                    PermissionFlagsBits.ViewChannel
                ]
            });
    
            guild.channels.create({
                name: "ticket-" + value + "-" + interaction.user.username,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: channelMembers
            }).then(async textChannel => {
                await interaction.reply({
                    content: "Se creo tu ticket en " + textChannel.toString(),
                    flags: [ MessageFlags.Ephemeral ]
                });
    
                const embed = new EmbedBuilder()
                    .setDescription(
                        "Espera a que un miembro del staff este disponible para atender tu ticket, evita hacer pings."
                    )
                    .setColor(0xD49E69);
    
                const closeButtonComponent = new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Cerrar")
                    .setStyle(ButtonStyle.Danger);
                    
                const claimButtonComponent = new ButtonBuilder()
                    .setCustomId("ticket_claim")
                    .setLabel("Reclamar ticket")
                    .setStyle(ButtonStyle.Secondary);
    
                const row = new ActionRowBuilder()
                    .addComponents(claimButtonComponent, closeButtonComponent);
                
                textChannel.send({
                    embeds: [ embed ],
                    components: [ row ]
                });
            });
        }
    }
}