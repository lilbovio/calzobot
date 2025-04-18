const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder
 } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_tickets_config')
        .setDescription('Estable la categoria donde se crearan los tickets y envia el mensaje para crear tickets.')
        .addChannelOption(option =>
            option.setName("categoria")
                .setDescription("Categoria donde se crearan los tickets.")
                .setRequired(true)
        ),
    
    /**
    * @param {import('discord.js').CommandInteraction} interaction
    */
    async execute(interaction) {
        const channel = interaction.channel;
        const category = interaction.options.getChannel("categoria");
        
        if (!category | category.type !== ChannelType.GuildCategory) {
            return await interaction.reply({
                content: "Debes seleccionar una categoría válida.",
                flags: [ 64 ] // MessageFlags.Ephemeral
            });
        }

        const config = require("../../config.json");
        config.TICKETS_CATEGORY_ID = category.id;

        const newConfig = JSON.stringify(config, null, 4);

        try {
            fs.writeFileSync('../../config.json', newConfig);
        } catch(e) {
            console.error("/set_tickets_config: No se pudo actualizar el archivo de configuración en setTicketsConfig.js!\n\r" + e);
            // await interaction.reply("No se pudo completar la operación!");
            //return;
        }

        const embed = new EmbedBuilder()
            .setTitle("🎫 Abrir un ticket")
            .setDescription(
                "# ¿Cómo Funcionan los Tickets en Nuestro Servidor?\n" +
                "¡Hola a todos! Queremos asegurarnos de que comprendan cómo utilizar nuestro sistema de tickets para resolver dudas, quejas o apelaciones de manera efectiva.\n" +
                "\n" +
                "## ¿Qué Son los Tickets?\n" +
                "Los tickets nos permiten manejar tus inquietudes de manera ordenada y privada. Puedes abrir un ticket si necesitas ayuda con:\n" +
                "**Dudas:** Consultas sobre el funcionamiento del servidor o sus reglas.\n" +
                "**Quejas o reportes:** Reportar comportamientos inapropiados o problemas en el servidor.\n" +
                "**Bugs y fallos:** Avisar o pedir ayuda sobre un error o bug de alguna función en el servidor o del bot.\n" +
                "**Apelaciones:** Apelar un warn o mute que consideres injusto.\n" +
                "\n" +
                "## ¿Como crear un ticket?\n" +
                "Aca abajo puedes ver un menu de selección, puedes presionarlo para luego elegir el tipo de ticket que quieres abrir, luego de eleggir el ticket se generara se automaticamente.\n" +
                "\n" +
                "## ¿Qué hago ya en el ticket?\n" +
                "### Describe tu Inquietud\n" +
                "Describe detalladamente tu queja, duda o apelación. Proporciona toda la información relevante, incluyendo capturas de pantalla si es necesario.\n" +
                "Espera a que un miembro del equipo de soporte revise tu ticket y pueda responder lo antes posible.\n" + 
                "Te mantendremos informado durante todo el proceso y trabajaremos contigo para resolver el problema.\n" +
                "\n" +
                "***Además pedimos que evites hacer pings.***"
            )
            .setColor(0xD49E69);

        const selectComponent = new StringSelectMenuBuilder()
			.setCustomId('ticket_types')
			.setPlaceholder('Selecciona el tipo de ticket!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Ayuda/Dudas')
					.setDescription('Para abrir una petición de soporte Ayuda/Dudas')
					.setValue('ticket_doubt')
			        .setEmoji({
                        name: "HelperBadge",
                        id: "1294495946096250891"
                    }),
				new StringSelectMenuOptionBuilder()
					.setLabel('Reportes')
					.setDescription('Si quieres reportar a un usuario puedes seleccionar esta opción.')
					.setValue('ticket_report')
			        .setEmoji({
                        name: "TP_Report",
                        id: "953135756728221756"
                    }),
				new StringSelectMenuOptionBuilder()
					.setLabel('Bugs y fallos')
					.setDescription('Para abrir una petición de soporte de Bug y Fallos, puedes seleccionar esta opción.')
					.setValue('ticket_bug')
			        .setEmoji({
                        name: "TP_BugHunterLvl2",
                        id: "1227213774726107166"
                    }),
				new StringSelectMenuOptionBuilder()
					.setLabel('Soporte de apelación')
					.setDescription('Para abrir una petición de apelación, puedes seleccionar esta opción.')
					.setValue('ticket_appeal')
			        .setEmoji({
                        name: "STAFF_retirado",
                        id: "1295185177705844759"
                    })
			);

        const row = new ActionRowBuilder()
			.addComponents(selectComponent);

        channel.send({
            embeds: [ embed ],
            components: [ row ]
        });

        await interaction.reply("🏓 Configuración actualizada!");

        console.log("> El usuario " + interaction.user.username + " ejecuto el comando /" + interaction.commandName + " categoria: #" + category.name)
    }
};
