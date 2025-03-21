const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
    name: Events.Error,
    async execute(error, client) {
        console.error(error);

        const logChannel = client.channels.cache.get("1350367520766296115");
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("❌ Error Detectado")
            .setDescription(`\`\`\`${error.message}\`\`\``)
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    },
};
