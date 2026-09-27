const { AuditLogEvent } = require('discord.js');
const config = require('../config.json');

// Discord limita fetchAuditLogs a 5 peticiones cada 5 s por guild. Con siete
// eventos por separado el limite se agota rapido y el log deja de llegar, asi
// que se cachea la ultima consulta durante un instante.
const CACHE_MS = 1200;

const cache = new Map();

function getAuditoryChannel(guild) {
    if (!guild || !config.AUDITORY_CHANNEL_ID) return null;
    const channel = guild.channels.cache.get(config.AUDITORY_CHANNEL_ID);
    if (!channel) {
        console.error(`[auditoria] el canal ${config.AUDITORY_CHANNEL_ID} no existe en ${guild.name}. Configuralo con /set_auditory_channel.`);
        return null;
    }
    return channel;
}

async function findExecutor(guild, { type, targetId }) {
    if (!guild || !targetId) return null;

    const key = guild.id;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_MS) {
        return pickEntry(cached.logs, type, targetId);
    }

    let logs;
    try {
        logs = await guild.fetchAuditLogs({ type, limit: 6 });
    } catch (err) {
        console.error(`[auditoria] no se pudo leer el audit log de ${guild.name}: ${err.code || ''} ${err.message}`);
        return null;
    }

    cache.set(key, { at: Date.now(), logs });
    return pickEntry(logs, type, targetId);
}

function pickEntry(logs, type, targetId) {
    // targetId null cubre las entradas que no apuntan a nada concreto.
    const entry = logs.entries.find(item => item.targetId === targetId || item.target?.id === targetId);
    if (!entry) return null;
    // El propio bot no genera registros de auditoria: si aparece, el evento
    // lo disparo otra cosa o es un cambio de estado, no una accion de alguien.
    if (entry.executorId === entry.target?.botId) return null;
    if (entry.createdTimestamp < Date.now() - 10000) return null;
    if (entry.executor?.bot && entry.executorId === config.CLIENT_ID) return null;
    return entry;
}

async function sendAudit(guild, embed) {
    const channel = getAuditoryChannel(guild);
    if (!channel) return false;
    if (!channel.isTextBased?.() && !channel.send) return false;
    try {
        await channel.send({ embeds: [embed] });
        return true;
    } catch (err) {
        console.error(`[auditoria] no se pudo enviar a #${channel.name}: ${err.code || ''} ${err.message}`);
        return false;
    }
}

function buildEmbed({ executor, color, description, footer }) {
    return {
        color,
        description: executor ? `<@${executor.id}> ${description}` : description,
        author: executor ? { name: executor.username, icon_url: executor.displayAvatarURL() } : undefined,
        footer: { text: footer },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    AuditLogEvent,
    getAuditoryChannel,
    findExecutor,
    sendAudit,
    buildEmbed
};
