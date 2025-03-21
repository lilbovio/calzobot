const { Events, EmbedBuilder } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {

        // Obtener el canal de auditoría en cada evento
        const auditoryChannel = message.guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );

        /* const message = ;
        const messageDeleter = ;

        auditoryChannel.send({embeds: 
            [{description: "", author: messageDeleter, footer: "Autor: " + messageDeleter.id + " | ID de mensaje: " + message.id }]
        })*/
        
        // En proceso...

        // auditoryChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
};
