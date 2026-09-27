const PrefixSchema = require('../models/prefixSchema');
const config = require('../config.json');

const cache = new Map();

function defaultPrefixes() {
    const raw = Array.isArray(config.PREFIX) ? config.PREFIX : [config.PREFIX || 'c!'];
    return raw.map(String).filter(prefix => prefix.length > 0);
}

async function load() {
    cache.clear();
    try {
        const docs = await PrefixSchema.find({}, { guildId: 1, prefix: 1, _id: 0 }).lean();
        for (const doc of docs) {
            if (doc.prefix) cache.set(doc.guildId, doc.prefix);
        }
        console.log(`Prefijos cargados para ${cache.size} servidor(es).`);
    } catch (err) {
        console.error('No se pudieron cargar los prefijos:', err.message);
    }
}

function getPrefixes(guildId) {
    if (guildId && cache.has(guildId)) return [cache.get(guildId)];
    return defaultPrefixes();
}

async function setPrefix(guildId, prefix) {
    await PrefixSchema.findOneAndUpdate(
        { guildId },
        { $set: { prefix } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    cache.set(guildId, prefix);
    return prefix;
}

function validatePrefix(prefix) {
    const value = String(prefix || '').trim();
    if (!value) return { error: 'El prefijo no puede estar vacío.' };
    if (value.length > 5) return { error: 'El prefijo puede tener hasta 5 caracteres.' };
    if (/\s/.test(value)) return { error: 'El prefijo no puede contener espacios.' };
    if (/^<[@#!]/.test(value)) return { error: 'El prefijo no puede empezar con una mención.' };
    if (!/^[\p{L}\p{N}_~$!.:^@%&+\-=[\]{}|;'",<>/?`¡¿]+$/u.test(value)) {
        return { error: 'El prefijo tiene caracteres no permitidos.' };
    }
    return { value };
}

module.exports = { load, getPrefixes, setPrefix, defaultPrefixes, validatePrefix };
