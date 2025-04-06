const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Jail = require('../../models/jailSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jail')
        .setDescription('Envia a un usuario a Jail por un tiempo determinado.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario que será enviado a Jail.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tiempo')
                .setDescription('Tiempo en Jail (Ej: 1d, 5h, 30m).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del castigo.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const tiempoStr = interaction.options.getString('tiempo');
        const razon = interaction.options.getString('razon') || 'No especificada';
        const jailRoleId = require('../../config.json').JAIL_ROLE_ID;
        const member = interaction.guild.members.cache.get(user.id);
        const ROLE_PERSISTENTE = '1338628605231501413';

        if (user.id === interaction.user.id) {
            return interaction.reply({ content: "❌ No puedes jailearte a ti mismo.", ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: '❌ No se pudo encontrar al usuario.', ephemeral: true });
        }

        // 🔹 Convertir el tiempo ingresado a milisegundos
        const tiempoMatch = tiempoStr.match(/^(\d+)([dhm])$/);
        if (!tiempoMatch) {
            return interaction.reply({ content: '❌ Formato inválido. Usa `Xd`, `Xh`, o `Xm` (Ej: `1d`, `5h`, `30m`).', ephemeral: true });
        }

        let tiempoMs;
        const cantidad = parseInt(tiempoMatch[1]);
        switch (tiempoMatch[2]) {
            case 'd': tiempoMs = cantidad * 24 * 60 * 60 * 1000; break;
            case 'h': tiempoMs = cantidad * 60 * 60 * 1000; break;
            case 'm': tiempoMs = cantidad * 60 * 1000; break;
        }

        // Guardar roles previos antes de quitar
        const rolesPrevios = member.roles.cache.map(role => role.id);
        console.log(rolesPrevios);

        // 🔹 Mantener el rol persistente si lo tiene
        const nuevosRoles = member.roles.cache.has(ROLE_PERSISTENTE)
            ? [jailRoleId, ROLE_PERSISTENTE]
            : [jailRoleId];

        await member.roles.set(nuevosRoles);

        // 🔹 Guardar o actualizar Jail en la base de datos
        const existingJail = await Jail.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (existingJail) {
            existingJail.rolesPrevios = rolesPrevios;
            existingJail.razon = razon;
            existingJail.liberacion = Date.now() + tiempoMs;
            existingJail.timesJailed += 1;
            await existingJail.save();
        } else {
            await Jail.create({
                userId: user.id,
                guildId: interaction.guild.id,
                rolesPrevios: rolesPrevios,
                razon: razon,
                liberacion: Date.now() + tiempoMs,
                timesJailed: 1
            });
        }

        // Crear Embed
        const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🚨 Usuario enviado a Jail 🚨')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(`🔹 **Usuario:** <@${user.id}>`)
        .addFields(
            { name: '👮 Moderador', value: `<@${interaction.user.id}>`, inline: true },
            { name: `⏰ **Tiempo:**`, value: `${cantidad}${tiempoMatch[2]}`, inline: true},
            { name: `📌 **Razon**`, value: `${razon}`, inline: true},
            { name: '📅 **Fecha de liberación**', value: `<t:${Math.floor((Date.now() + tiempoMs) / 1000)}:R>` },
        )
        .setFooter({ text: 'El usuario será liberado automáticamente al finalizar el tiempo.' });

        interaction.reply({ embeds: [embed] });

        // Configurar la liberación
        setTimeout(async () => {
            const jailData = await Jail.findOneAndDelete({ userId: user.id, guildId: interaction.guild.id });

            if (jailData) {
                const usuario = interaction.guild.members.cache.get(user.id);
                if (usuario) {
                    await usuario.roles.set(jailData.rolesPrevios);
                    const freeEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('✅ Usuario liberado de Jail')
                        .setDescription(`🔹 **Usuario:** <@${user.id}>\n🔹 **Motivo del castigo:** ${razon}`)
                        .setFooter({ text: 'Liberación automática completada.' });

                    const logChannel = interaction.guild.channels.cache.get(require('../../config.json').LOG_CHANNEL_ID);
                    if (logChannel) logChannel.send({ embeds: [freeEmbed] });

                    usuario.send(`🔔 Has sido liberado de Jail en ${interaction.guild.name}.`);
                }
            }
        }, tiempoMs);
    }
};
