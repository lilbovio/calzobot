const { Events, EmbedBuilder } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        
        const messageReceived = new Message({
            messageID: message.id,
            content: message.content,
            authorID: message.author.id,
            authorTag: message.author.tag,
            channelID: message.channel.id,
            guildID: message.guild.id,
            timestamp: { type: Date, default: Date.now }
        });

        await messageReceived.save()
            .then(() => console.log(`💾 Mensaje guardado en Mongoose`))
            .catch(err => console.error('❌ Error al guardar mensaje', err));
    }
};
