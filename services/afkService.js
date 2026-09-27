const AFK = require('../models/afkSchema');

const cache = new Map();

async function load() {
    cache.clear();
    try {
        const docs = await AFK.find({}, { userId: 1, reason: 1, timestamp: 1, _id: 0 }).lean();
        for (const doc of docs) {
            cache.set(doc.userId, { reason: doc.reason, timestamp: doc.timestamp });
        }
    } catch (err) {
        console.error('No se pudo cargar el estado AFK:', err.message);
    }
}

function isAfk(userId) {
    return cache.has(userId);
}

function get(userId) {
    return cache.get(userId) || null;
}

async function set(userId, reason) {
    const timestamp = new Date();
    await AFK.findOneAndUpdate(
        { userId },
        { $set: { reason, timestamp } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    cache.set(userId, { reason, timestamp });
}

async function clear(userId) {
    await AFK.deleteOne({ userId });
    cache.delete(userId);
}

function size() {
    return cache.size;
}

module.exports = { load, isAfk, get, set, clear, size };
