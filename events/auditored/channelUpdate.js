const { Events, EmbedBuilder } = require('discord.js');

// const Channel = require('../../models/channelSchema');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        
        // En proceso...

        // auditoryChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
};
