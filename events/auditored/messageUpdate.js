const { Events } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageUpdate,
    async execute(client, oldMessage, newMessage) {
        if (!oldMessage.guild) return; // Ignorar DMs
        
        if (oldMessage.channel.id == require('../../config.json').AUDITORY_CHANNEL_ID) {
            return; // Ignorar el canal de logs
        }

        const guild = client.guilds.cache.get(oldMessage.guildId);
        const channel = guild.channels.cache.get(oldMessage.channelId);
        const dbMessage = Message.findOne({messageID: oldMessage.id});
        const author = oldMessage.author;

        const auditoryChannel = guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );
        
        auditoryChannel.send({embeds:
            [{
                description: "Un mensaje de <@" + author.id + "> fue **editado** en " + channel.url + "\nAntes: " + dbMessage.content + "\n\nDespues: " + newMessage.content,
                author: { name: author.username, icon_url: author.displayAvatarURL() },
                footer: { text: "ID de Autor: " + author.id + " | ID de mensaje: " + oldMessage.id },
                color: 0x1F99E3 
            }]
        });

        try {
            await Message.deleteOne({ messageID: oldMessage.id });
        } catch (e) {
            console.err(e);
        }
    }
};
