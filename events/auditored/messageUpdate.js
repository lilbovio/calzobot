const { Events } = require('discord.js');
const Message = require('../../models/messageSchema');
const config = require('../../config.json');
const { sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild) return;
        if (oldMessage.channelId === config.AUDITORY_CHANNEL_ID) return;
        if (oldMessage.author?.bot) return;
        // Discord dispara esto tambien porpins, embeds y reacciones.
        if (oldMessage.content === newMessage.content) return;

        try {
            const dbMessage = await Message.findOne({ messageID: oldMessage.id });
            const authorId = dbMessage?.authorID || oldMessage.author?.id;
            const before = dbMessage?.content || oldMessage.content || '*(contenido no disponible)*';

            let author = oldMessage.author;
            if (authorId && authorId !== author?.id) {
                author = (await oldMessage.guild.members.fetch(authorId).catch(() => null))?.user || author;
            }

            await sendAudit(oldMessage.guild, buildEmbed({
                executor: author,
                color: COLOR,
                description: `**editó** un mensaje en ${oldMessage.channel?.url || 'un canal'}\n\u2016 **Antes:** ${before}\n\u2016 **Después:** ${newMessage.content}`,
                footer: `ID de Autor: ${author?.id || 'desconocido'} | ID de mensaje: ${oldMessage.id}`
            }));

            await Message.updateOne({ messageID: oldMessage.id }, { $set: { content: newMessage.content } });
        } catch (err) {
            console.error(`[auditoria] error registrando messageUpdate ${oldMessage.id}:`, err.message);
        }
    }
};
