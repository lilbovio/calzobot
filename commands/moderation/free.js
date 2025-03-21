const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const JailSchema = require('../../models/jailSchema');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('free')
        .setDescription('Libera a un usuario antes de tiempo.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario a liberar')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.roles.cache.some(role => config.MOD_ROLES.includes(role.id))) {
            return interaction.reply({ content: "❌ No tienes permisos para usar este comando.", ephemeral: true });
        }

        const user = interaction.options.getUser('usuario');
        const member = interaction.guild.members.cache.get(user.id);
        const jailData = await JailSchema.findOneAndDelete({ userId: user.id, guildId: interaction.guild.id });

        if (!jailData) {
            return interaction.reply({ content: '❌ Este usuario no está en Jail.', ephemeral: true });
        }

        if (member) {
            await member.roles.set(jailData.rolesPrevios);
            await user.send('🔔 Has sido liberado de Jail antes de tiempo.')
                .catch(() => console.log('No se pudo enviar DM al usuario.'));
        }

        // Embed de liberación
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Usuario liberado de Jail')
            .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Liberado antes de tiempo.**`)
            .setFooter({ text: 'Acción manual realizada por un moderador.' });

        interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};
