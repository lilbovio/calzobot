const { Events } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageDelete,
    async execute(client, message) {
        if (!message.guild) return; // Ignorar DMs
        
        if (message.channel.id == require('../../config.json').AUDITORY_CHANNEL_ID) {
            return; // Ignorar el canal de logs
        }

        const guild = client.guilds.cache.get(message.guildId);
        const channel = guild.channels.cache.get(message.channelId);

        const dbMessage = await Message.findOne({messageID: message.id});
        const author = (await guild.members.fetch(dbMessage.authorID)).user;
        
        const auditoryChannel = guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );
        
        auditoryChannel.send({embeds:
            [{
                description: "Un mensaje de <@" + author.id + "> fue **eliminado** en " + channel.url + "\n" + dbMessage.content,
                author: { name: author.username, icon_url: author.displayAvatarURL() },
                footer: { text: "ID de Autor: " + author.id + " | ID de mensaje: " + message.id },
                color: 0x1F99E3
            }]
        });

        try {
            await Message.deleteOne({ messageID: message.id });
        } catch (e) {
            console.err(e);
        }
    }
};
