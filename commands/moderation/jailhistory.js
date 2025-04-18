const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Jail = require('../../models/jailSchema');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jailhistory')
        .setDescription('Muestra el historial de Jail de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario del que deseas ver el historial.')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
        }

        const jails = await Jail.find({ userId: user.id, guildId: interaction.guild.id });

        if (!jails.length) {
            return interaction.reply({ content: `✅ ${user} no tiene historial de Jail.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x9900ff)
            .setTitle('📚 Historial de Jail de ' + user.username)
            .setDescription(`Lista de castigos para ${user}:`)
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'Sistema de Jail', iconURL: interaction.client.user.displayAvatarURL() });

        jails.forEach((entry, index) => {
            embed.addFields({
                name: `🔹 ${index + 1}. ${entry.razon}`,
                value: `📅 **Liberación programada:** <t:${Math.floor(entry.liberacion / 1000)}:F>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
};