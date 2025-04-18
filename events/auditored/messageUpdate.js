const { Events } = require('discord.js');
const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild) return;

        const config = require('../../config.json');
        if (oldMessage.channel.id === config.AUDITORY_CHANNEL_ID) return;

        const guild = oldMessage.guild;
        const channel = guild.channels.cache.get(oldMessage.channelId);

        const dbMessage = await Message.findOne({ messageID: oldMessage.id });

        if (!dbMessage) {
            console.warn(`⚠️ No se encontró el mensaje ${oldMessage.id} en la base de datos.`);
            return;
        }

        try {
            const author = (await guild.members.fetch(dbMessage.authorID)).user;
            const auditoryChannel = guild.channels.cache.get(config.AUDITORY_CHANNEL_ID);

            auditoryChannel.send({
                embeds: [{
                    description: `Un mensaje de <@${author.id}> fue **editado** en ${channel}\n\n📥 **Antes:** ${dbMessage.content}\n📤 **Después:** ${newMessage.content}`,
                    author: { name: author.username, icon_url: author.displayAvatarURL() },
                    footer: { text: `ID de Autor: ${author.id} | ID de mensaje: ${oldMessage.id}` },
                    color: 0x1F99E3
                }]
            });

            await Message.updateOne(
                { messageID: oldMessage.id },
                { $set: { content: newMessage.content } }
            );
        } catch (err) {
            console.error('❌ Error al procesar messageUpdate:', err);
        }
    }
};
