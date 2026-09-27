const { Events } = require('discord.js');
const Message = require('../../models/messageSchema');
const config = require('../../config.json');

// El schema guarda el contenido de todos los mensajes para poder reconstruir
// borrados y ediciones. Sin indice ni limite la coleccion crece sin control.
const MAX_DOCS = 50000;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild) return;
        if (message.channelId === config.AUDITORY_CHANNEL_ID) return;
        if (message.author?.bot) return;

        try {
            await Message.create({
                messageID: message.id,
                content: message.content,
                authorID: message.author.id,
                authorTag: message.author.tag,
                channelID: message.channel.id,
                channelName: message.channel.name,
                guildID: message.guild.id
            });
        } catch (err) {
            // 11000 = mensaje ya guardado (evento repetido), no es un problema.
            if (err.code !== 11000 && err.code !== 11001) {
                console.error('[auditoria] no se pudo guardar el mensaje', message.id, err.message);
                return;
            }
        }

        if (Math.random() < 0.02) {
            const total = await Message.estimatedDocumentCount();
            if (total > MAX_DOCS) {
                const sobra = total - MAX_DOCS;
                const viejos = await Message.find({}, { messageID: 1 }).sort({ _id: 1 }).limit(sobra).select('_id');
                await Message.deleteMany({ _id: { $in: viejos.map(d => d._id) } });
                console.log(`[auditoria] poda: ${sobra} mensajes antiguos (total ${total})`);
            }
        }
    }
};
