const { Events } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild) return; // Ignorar DMs

        if (message.channel.id == require('../../config.json').AUDITORY_CHANNEL_ID) {
            return; // Ignorar el canal de logs
        }
        
        const messageReceived = new Message({
            messageID: message.id,
            content: message.content,
            authorID: message.author.id,
            authorTag: message.author.tag,
            channelID: message.channel.id,
            channelName: message.channel.name,
            guildID: message.guild.id
        });

        await messageReceived.save()
            // .then(() => console.log(`💾 Mensaje guardado en Mongoose`))
            .catch(err => console.error('❌ Error al guardar mensaje', err));
    }
};
