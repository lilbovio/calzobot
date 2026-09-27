const { Events, AuditLogEvent } = require('discord.js');
const { findExecutor, sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;

        const entry = await findExecutor(channel.guild, {
            type: AuditLogEvent.ChannelDelete,
            targetId: channel.id
        });
        if (!entry) return;

        await sendAudit(channel.guild, buildEmbed({
            executor: entry.executor,
            color: COLOR,
            description: `elimino el canal **#${channel.name}** (${channel.id})`,
            footer: `ID de Autor: ${entry.executorId} | ID del canal: ${channel.id}`
        }));
    }
};
