const { Events, AuditLogEvent } = require('discord.js');
const { findExecutor, sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        // Discord dispara este evento tambien por cambios de estado (permisos,
        // tema, posicion). Si no cambio nada visible no se registra.
        const cambios = [];
        if (oldChannel.name !== newChannel.name) cambios.push(`**Nombre:** \`${oldChannel.name}\` \u2192 \`${newChannel.name}\``);
        if (oldChannel.parentId !== newChannel.parentId) cambios.push(`**Categoría:** \`${oldChannel.parent?.name || 'sin categoría'}\` \u2192 \`${newChannel.parent?.name || 'sin categoría'}\``);
        if (oldChannel.nsfw !== newChannel.nsfw) cambios.push(`**NSFW:** ${oldChannel.nsfw ? 'sí' : 'no'} \u2192 ${newChannel.nsfw ? 'sí' : 'no'}`);
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) cambios.push(`**Lento:** ${oldChannel.rateLimitPerUser || 0}s \u2192 ${newChannel.rateLimitPerUser || 0}s`);
        if (oldChannel.bitrate !== newChannel.bitrate) cambios.push(`**Bitrate:** ${oldChannel.bitrate} \u2192 ${newChannel.bitrate}`);
        if (oldChannel.userLimit !== newChannel.userLimit) cambios.push(`**Límite de usuarios:** ${oldChannel.userLimit} \u2192 ${newChannel.userLimit}`);
        if (!cambios.length) return;

        const entry = await findExecutor(newChannel.guild, {
            type: AuditLogEvent.ChannelUpdate,
            targetId: newChannel.id
        });
        if (!entry) return;

        await sendAudit(newChannel.guild, buildEmbed({
            executor: entry.executor,
            color: COLOR,
            description: `editó ${newChannel.url}\n${cambios.join('\n')}`,
            footer: `ID de Autor: ${entry.executorId} | ID del canal: ${newChannel.id}`
        }));
    }
};
