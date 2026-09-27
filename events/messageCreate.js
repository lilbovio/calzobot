const { Events, EmbedBuilder } = require('discord.js');
const afkService = require('../services/afkService');
const prefixService = require('../services/prefixService');

function minutesSince(timestamp) {
    return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
}

async function handleAfk(message) {
    if (afkService.isAfk(message.author.id)) {
        const data = afkService.get(message.author.id);
        await afkService.clear(message.author.id).catch(() => {});
        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('👋 Estado AFK eliminado')
            .setDescription(`${message.author} volviste. Razón registrada: **${data.reason}**`)
            .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (!message.mentions?.users?.size) return;

    for (const [, mentionedUser] of message.mentions.users) {
        if (mentionedUser.bot || mentionedUser.id === message.author.id) continue;
        if (!afkService.isAfk(mentionedUser.id)) continue;

        const data = afkService.get(mentionedUser.id);
        const embed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('⚠️ Usuario AFK')
            .setDescription(`${mentionedUser} está AFK desde hace **${minutesSince(data.timestamp)} minutos**.\n**Razón:** ${data.reason || 'Sin razón'}`)
            .setTimestamp();
        await message.reply({ embeds: [embed] }).catch(() => {});
    }
}

function findPrefix(content, guildId) {
    const prefixes = prefixService.getPrefixes(guildId).sort((a, b) => b.length - a.length);
    return prefixes.find(prefix => content.startsWith(prefix)) || null;
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client) {
        if (!message || !message.author || message.author.bot) return;
        if (!message.content) return;

        try {
            await handleAfk(message);
        } catch (err) {
            console.error('Error manejando AFK:', err);
        }

        const usedPrefix = findPrefix(message.content, message.guild?.id);
        if (!usedPrefix) return;

        const tokens = message.content.slice(usedPrefix.length).trim().split(/\s+/).filter(Boolean);
        const commandName = (tokens.shift() || '').toLowerCase();
        if (!commandName) return;

        const commands = client?.commands;
        if (!commands) return;

        const command = commands.get(commandName)
            || commands.find(item => Array.isArray(item.aliases) && item.aliases.includes(commandName));
        if (!command) return;

        try {
            if (typeof command.executeMessage === 'function') {
                await command.executeMessage(message, tokens, client);
            } else if (typeof command.execute === 'function') {
                await command.execute(message, tokens, client);
            } else {
                await message.reply('❌ El comando no está implementado correctamente.').catch(() => {});
            }
        } catch (err) {
            console.error(`❌ Error ejecutando "${commandName}" por prefijo:`, err);
            await message.reply('❌ Ocurrió un error al ejecutar el comando.').catch(() => {});
        }
    }
};
