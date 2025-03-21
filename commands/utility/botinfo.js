const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Muestra información sobre el bot.'),

    async execute(interaction) {
        const ping = interaction.client.ws.ping;
        const prefix = config.PREFIX || '/';
        const creator = config.OWNER_ID || 'Desconocido';

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🤖 Información del Bot')
            .addFields(
                { name: '📶 Ping', value: `${ping}ms`, inline: true },
                { name: '📌 Prefijo', value: prefix, inline: true },
                { name: '👤 Creador', value: `<@${creator}>`, inline: true }
            )
            .setFooter({ text: 'Hosteado con AerioHost!🛡' });

        const button = new ButtonBuilder()
            .setLabel('Ir al Host')
            .setStyle(5)
            .setURL('https://discord.gg/aeriohost');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
