const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');


const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageDelete,
    async execute(client, message) {
        if (!message.guild) return; // Ignorar DMs

        const guild = client.guilds.cache.get(message.guildId);

        const auditoryChannel = guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );

        const author = message.author;
        const channel = guild.channels.cache.get(message.channelId);

        console.log("--------" + message);
        
        auditoryChannel.send({embeds:
            [{
                description: "Un mensaje enviado por " + author.name + " fue **eliminado** en " + channel.url + "\n" + message.content,
                author: { name: author.username, icon_url: author.displayAvatarURL() },
                footer: { text: "Autor: " + author.id + " | ID de mensaje: " + message.id } 
            }]
        });
        
        // En proceso...
    }
};
