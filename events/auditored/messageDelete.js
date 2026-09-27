const { Events } = require('discord.js');
const Message = require('../../models/messageSchema');
const config = require('../../config.json');
const { sendAudit, buildEmbed } = require('../../utils/auditHelper');

const COLOR = 0x1f99e3;

module.exports = {
    name: Events.MessageDelete,
    // El loader llama execute(message, client). Antes la firma estaba invertida
    // (client, message), asi que message era el client y la funcion volvia
    // siempre en la primera linea sin registrar nada.
    async execute(message) {
        if (!message.guild) return;
        if (message.channelId === config.AUDITORY_CHANNEL_ID) return;
        if (message.author?.bot) return;

        try {
            const dbMessage = await Message.findOne({ messageID: message.id });
            const authorId = dbMessage?.authorID;
            const content = dbMessage?.content || message.content || '*(contenido no disponible)*';

            let author = message.author;
            if (authorId && authorId !== message.author?.id) {
                author = (await message.guild.members.fetch(authorId).catch(() => null))?.user || author;
            }

            await sendAudit(message.guild, buildEmbed({
                executor: author,
                color: COLOR,
                description: `**eliminó** un mensaje en ${message.channel?.url || 'un canal'}\n${content}`,
                footer: `ID de Autor: ${author?.id || 'desconocido'} | ID de mensaje: ${message.id}`
            }));

            await Message.deleteOne({ messageID: message.id });
        } catch (err) {
            console.error(`[auditoria] error registrando messageDelete ${message.id}:`, err.message);
        }
    }
};
