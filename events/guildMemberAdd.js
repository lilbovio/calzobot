const { Events, EmbedBuilder } = require('discord.js');
const WelcomeSchema = require('../models/welcomeSchema');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const welcomeData = await WelcomeSchema.findOne({ guildId: member.guild.id });
        if (!welcomeData) return;

        const welcomeChannel = member.guild.channels.cache.get(welcomeData.channelId);
        if (!welcomeChannel) return;

        const welcomeMessage = welcomeData.message.replace('{usuario}', `<@${member.id}>`);

        const embed = new EmbedBuilder()
            .setTitle('🎉 ¡Bienvenido!')
            .setDescription(welcomeMessage)
            .setColor('Green')
            .setTimestamp();

        // Si está activado lo de la imagen, usa la foto de perfil del usuario como thumbnail
        if (welcomeData.image) {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        }

        welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
};
