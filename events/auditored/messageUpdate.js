const { Events, EmbedBuilder } = require('discord.js');

const Message = require('../../models/messageSchema');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        
        // En proceso...

        // auditoryChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
};
