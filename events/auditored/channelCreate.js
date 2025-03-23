const { Events, AuditLogEvent } = require('discord.js');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        const auditoryChannel = channel.guild.channels.cache.get(
            require('../../config.json').AUDITORY_CHANNEL_ID
        );

        let author;
        try {
            const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate });
            const entry = logs.entries.find(entry => entry.target.id === channel.id);
    
            if (entry) {
                author = entry.executor; // Devuelve el autor si lo necesitas
            }
        } catch (error) {
            console.error(error);
            return;
        }
        
        auditoryChannel.send({embeds:
            [{
                description: "<@" + author.id + "> **creo** el nuevo canal " + channel.url,
                author: { name: author.username, icon_url: author.displayAvatarURL() },
                footer: { text: "ID de Autor: " + author.id + " | ID del canal: " + channel.id },
                color: 0x1F99E3
            }]
        });
    }
};
