const { EmbedBuilder } = require('discord.js');
const AFK = require('../models/afkSchema');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // 🟢 Detectar si el usuario AFK ha enviado un mensaje
        const afkUser = await AFK.findOne({ userID: message.author.id });
        if (afkUser) {
            await AFK.deleteOne({ userID: message.author.id });

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎉 Modo AFK desactivado')
                .setDescription(`Tu estado AFK ha sido removido.`)
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // 🔴 Detectar menciones a usuarios AFK
        if (message.mentions.users.size > 0) {
            const afkMentions = message.mentions.users.filter(async user => {
                return await AFK.findOne({ userID: user.id });
            });

            afkMentions.forEach(async user => {
                const afkData = await AFK.findOne({ userID: user.id });
                if (afkData) {
                    const timePassed = Math.floor((Date.now() - afkData.timestamp) / 60000);
                    const embed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('🚨 Usuario AFK')
                        .setDescription(`**${user.username}** está AFK desde hace **${timePassed} minutos**.\n**Razón:** ${afkData.reason}`)
                        .setTimestamp();

                    message.reply({ embeds: [embed] });
                }
            });
        }
    }
};
