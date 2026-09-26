const { Events } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageBulkDelete,
    async execute(messages, channel) {
        if (!oldMessage.guild) return; // Ignorar DMs
        
        if (channel.id == require('../../config.json').AUDITORY_CHANNEL_ID) {
            return; // Ignorar el canal de logs
        }

        //messages.forEach(async (value, key) => {
        //    await Message.deleteOne({ messageId: value.id });
        //});
        const messageIDs = Array.from(messages.keys()); // Extraer los IDs de los mensajes de la coleccion
        await Message.deleteMany({ messageID: { $in: messageIDs } });

        const count = messages.size;

        const auditoryChannel = channel.guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );

        auditoryChannel.send({embeds:
            [{
                description: "Se hizo un nuke de " + count + " mensajes en " + channel.url,
                // author: { name: author.username, icon_url: author.displayAvatarURL() },
                footer: { text: "Cantidad de mensajes: " + count },
                color: 0x1F99E3
            }]
        });
    }
};
