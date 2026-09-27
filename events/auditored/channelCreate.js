const { Events, AuditLogEvent } = require('discord.js');
const { findExecutor, sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;

        const entry = await findExecutor(channel.guild, {
            type: AuditLogEvent.ChannelCreate,
            targetId: channel.id
        });
        if (!entry) return;

        await sendAudit(channel.guild, buildEmbed({
            executor: entry.executor,
            color: COLOR,
            description: `creo el canal ${channel.url}`,
            footer: `ID de Autor: ${entry.executorId} | ID del canal: ${channel.id}`
        }));
    }
};
