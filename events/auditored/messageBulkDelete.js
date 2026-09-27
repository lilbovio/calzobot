const { Events } = require('discord.js');
const Message = require('../../models/messageSchema');
const config = require('../../config.json');
const { sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.MessageBulkDelete,
    async execute(messages, channel) {
        // Antes referenciaba oldMessage, que no existe en este ambito: eso era
        // un ReferenceError que rompia el handler entero.
        if (!channel || !channel.guild) return;
        if (channel.id === config.AUDITORY_CHANNEL_ID) return;

        const messageIDs = [...messages.keys()];
        const count = messages.size;

        try {
            await Message.deleteMany({ messageID: { $in: messageIDs } });
        } catch (err) {
            console.error(`[auditoria] error limpiando mensajes borrados:`, err.message);
        }

        if (!count) return;

        await sendAudit(channel.guild, buildEmbed({
            executor: null,
            color: COLOR,
            description: `se borraron **${count}** mensajes de golpe en ${channel.url}`,
            footer: `Mensajes afectados: ${count}`
        }));
    }
};
