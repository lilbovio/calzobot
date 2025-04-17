const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
            const auditoryChannel = newChannel.guild.channels.cache.get(
                require('../../config.json').AUDITORY_CHANNEL_ID
            );
    
            let author;
            try {
                const logs = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate });
                const entry = logs.entries.find(entry => entry.target.id === newChannel.id);
        
                if (entry) {
                    author = entry.executor; // Devuelve el autor si lo necesitas
                }
            } catch (error) {
                console.error(error);
                return;
            }
            if (author && newChannel && oldChannel) {
                auditoryChannel.send({embeds:
                    [{
                        description: "<@" + author.id + "> **edito** el canal " + newChannel.url + "\nAntes: " + oldChannel.name + "\nDespues: " + newChannel.name,
                        author: { name: author.username, icon_url: author.displayAvatarURL() },
                        footer: { text: "ID de Autor: " + author.id + " | ID del canal: " + newChannel.id },
                        color: 0x1F99E3
                    }]
                });
            }
    }
};
