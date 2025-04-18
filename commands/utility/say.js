const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Envia un mensaje en un canal especifico.')
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal donde se enviara el mensaje.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("mensaje")
                .setDescription("Mensaje o texto que se enviara en el canal especifico.")
                .setRequired(true)
        ),

    /**
    * @param {import('discord.js').CommandInteraction} interaction
    */
    async execute(interaction) {
        const mensaje = interaction.options.getString("mensaje");
        const targetChannel = interaction.options.getChannel("canal");
        const member = interaction.member;

        const modRolesIds = [ ...require('../../config.json').MOD_ROLES ];

        if (!modRolesIds.some(role => 
            member.roles.cache.has(role)
        )) {
            return interaction.reply({
                content: "Solo un miembro del staff puede usar este botón!\n||Si eres parte del staff y no puedes usarlo, alerta a un administrador!||",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!targetChannel.isSendable()) {
            return interaction.reply({
                content: "No puedo enviar mensajes en ese canal",
                flags: MessageFlags.Ephemeral
            });
        }

        targetChannel.send(mensaje);

        await interaction.reply({ content: "Mensaje enviado en " + targetChannel.toString(), flags: MessageFlags.Ephemeral });
    }
};
