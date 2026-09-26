// ...existing code...
const { Events, EmbedBuilder } = require('discord.js');
const AfkSchema = require('../models/afkSchema');
// const PrefixSchema = require('../models/prefixSchema');
const config = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (!message || !message.author || message.author.bot) return;

        // --- Menciones AFK ---
        if (message.mentions?.users?.size > 0) {
            for (const [, mentionedUser] of message.mentions.users) {
                if (mentionedUser.bot) continue;
                try {
                    const mentionedAfk = await AfkSchema.findOne({ userId: mentionedUser.id }).catch(()=>null);
                    if (mentionedAfk) {
                        const afkTime = Math.floor((Date.now() - mentionedAfk.timestamp) / 60000);
                        const embed = new EmbedBuilder()
                            .setColor('Yellow')
                            .setTitle('⚠️ Usuario AFK')
                            .setDescription(`${mentionedUser} está AFK desde hace **${afkTime} minutos**.\n**Razón:** ${mentionedAfk.reason || "Sin razón"}`)
                            .setTimestamp();
                        message.reply({ embeds: [embed] }).catch(()=>{});
                    }
                } catch (err) {
                    console.error('Error comprobando AFK de mención:', err);
                }
            }
        }

        // --- Eliminación AFK del autor al enviar mensaje ---
        try {
            const afkData = await AfkSchema.findOne({ userId: message.author.id }).catch(()=>null);
            if (afkData) {
                await AfkSchema.deleteOne({ userId: message.author.id }).catch(()=>{});
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('👋 Estado AFK eliminado')
                    .setDescription(`Bienvenido de vuelta, ${message.author}. Tu estado AFK ha sido eliminado.`)
                    .setTimestamp();
                message.reply({ embeds: [embed] }).catch(()=>{});
                // seguimos procesando comandos
            }
        } catch (err) {
            console.error('Error manejando AFK del autor:', err);
        }

        // --- Manejo de prefijos (desde config) y ejecución de comandos por mensaje ---
        if (!message.content) return;

        // Usar únicamente los prefijos definidos en config.PREFIX (puede ser array)
        const prefixes = Array.isArray(config.PREFIX) ? [...config.PREFIX] : [String(config.PREFIX || 'c!')];
        console.log('[DEBUG] Prefijos activos:', prefixes);

        const usedPrefix = prefixes.find(p => message.content.startsWith(p));
        console.log('[DEBUG] usedPrefix:', usedPrefix ?? 'ninguno');
        if (!usedPrefix) return;
        console.log(`Prefijo detectado: ${usedPrefix}`);

        const args = message.content.slice(usedPrefix.length).trim().split(/\s+/).filter(Boolean);
        const commandName = (args.shift() || '').toLowerCase();
        console.log('[DEBUG] commandName:', JSON.stringify(commandName));
        if (!commandName) return;

        const cmds = client ? client.commands : (message.client ? message.client.commands : null);
        console.log('[DEBUG] client.commands size:', cmds ? cmds.size : 'no-collection');
        if (!cmds) return;

        const command = cmds.get(commandName) ||
            cmds.find(cmd => Array.isArray(cmd.aliases) && cmd.aliases.includes(commandName));
        if (!command) return;

        try {
            if (typeof command.executeMessage === 'function') {
                await command.executeMessage(message, args, client || message.client);
            } else if (typeof command.execute === 'function') {
                // intentar firmas comunes (compatibilidad)
                try {
                    await command.execute(message, args, client || message.client);
                } catch (e) {
                    try {
                        await command.execute(message, client || message.client, args);
                    } catch (e2) {
                        console.error('Error ejecutando command.execute con firmas comunes:', e2);
                        await message.reply('❌ Ocurrió un error al ejecutar el comando.').catch(()=>{});
                    }
                }
            } else {
                await message.reply('❌ El comando no está implementado correctamente.').catch(()=>{});
            }
        } catch (error) {
            console.error('❌ Error al ejecutar comando por prefijo:', error);
            try { await message.reply('❌ Ocurrió un error al ejecutar el comando.').catch(()=>{}); } catch {}
        }
    }
};