const mongoose = require('mongoose');
const Wallet = require('../models/walletSchema');
const EconomyLedger = require('../models/economyLedgerSchema');

const ECONOMY = {
    work: {
        minReward: 100,
        maxReward: 250,
        cooldownMs: 60 * 60 * 1000
    },
    steal: {
        successRate: 0.4,
        minRate: 0.1,
        maxRate: 0.2,
        minAmount: 25,
        maxAmount: 500,
        cooldownMs: 2 * 60 * 60 * 1000,
        fineRate: 0.1,
        maxFine: 100
    }
};

class EconomyError extends Error {
    constructor(code, details = {}) {
        super(code);
        this.name = 'EconomyError';
        this.code = code;
        Object.assign(this, details);
    }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isDuplicateKeyError(err) {
    return !!err && (err.code === 11000 || err.code === 11001);
}

function isTransactionsUnsupported(err) {
    const message = String(err && err.message);
    return /transaction numbers are only allowed|replica set|mongos/i.test(message);
}

function assertPositiveInteger(value) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new EconomyError('invalid_amount');
    }
}

async function runTransaction(fn) {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connection.asPromise();
    }
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
}

async function ensureWallet(guildId, userId, session) {
    const existing = await Wallet.findOne({ guildId, userId }, null, { session });
    if (existing) return existing;
    try {
        const created = await Wallet.create([{ guildId, userId, balance: 0 }], { session });
        return created[0];
    } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        return Wallet.findOne({ guildId, userId }, null, { session });
    }
}

async function creditWallet(guildId, userId, amount, session) {
    // upsert obligatorio: si el receptor nunca uso el bot no tiene wallet y sin esto
    // findOneAndUpdate devuelve null, lo que antes se reportaba como "fondos insuficientes".
    try {
        return await Wallet.findOneAndUpdate(
            { guildId, userId },
            { $inc: { balance: amount } },
            { new: true, upsert: true, setDefaultsOnInsert: true, session }
        );
    } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        await ensureWallet(guildId, userId, session);
        return Wallet.findOneAndUpdate(
            { guildId, userId },
            { $inc: { balance: amount } },
            { new: true, session }
        );
    }
}

async function debitWallet(guildId, userId, amount, session) {
    const updated = await Wallet.findOneAndUpdate(
        { guildId, userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
    );
    if (updated) return updated;
    await ensureWallet(guildId, userId, session);
    return Wallet.findOneAndUpdate(
        { guildId, userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
    );
}

async function writeLedger(session, entry) {
    const created = await EconomyLedger.create([entry], { session });
    return created[0];
}

async function claimCooldown({ guildId, userId, field, now, next, reward = 0 }, session) {
    const filter = {
        guildId,
        userId,
        $or: [
            { [field]: null },
            { [field]: { $exists: false } },
            { [field]: { $lte: now } }
        ]
    };
    const update = { $set: { [field]: next }, $inc: { balance: reward } };

    const claimed = await Wallet.findOneAndUpdate(filter, update, { new: true, session });
    if (claimed) return { wallet: claimed, claimed: true };

    await ensureWallet(guildId, userId, session);
    const retried = await Wallet.findOneAndUpdate(filter, update, { new: true, session });
    if (retried) return { wallet: retried, claimed: true };

    const current = await Wallet.findOne({ guildId, userId }, null, { session });
    return { wallet: current, claimed: false };
}

async function getWallet(guildId, userId) {
    const existing = await Wallet.findOne({ guildId, userId }).lean();
    if (existing) return existing;
    try {
        const created = await Wallet.create({ guildId, userId, balance: 0 });
        return created.toObject();
    } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        return Wallet.findOne({ guildId, userId }).lean();
    }
}

async function getCooldowns(guildId, userId) {
    const wallet = await getWallet(guildId, userId);
    return {
        balance: wallet.balance,
        workAvailableAt: wallet.workAvailableAt,
        stealAvailableAt: wallet.stealAvailableAt
    };
}

async function getHistory(guildId, userId, limit = 10) {
    return EconomyLedger.find({ guildId, userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

async function work({ guildId, userId, reference }) {
    const now = new Date();
    const reward = randomInt(ECONOMY.work.minReward, ECONOMY.work.maxReward);
    const availableAt = new Date(now.getTime() + ECONOMY.work.cooldownMs);

    return runTransaction(async (session) => {
        const { wallet, claimed } = await claimCooldown(
            { guildId, userId, field: 'workAvailableAt', now, next: availableAt, reward },
            session
        );

        if (!claimed) {
            throw new EconomyError('work_cooldown', { availableAt: wallet ? wallet.workAvailableAt : null });
        }

        await writeLedger(session, {
            guildId,
            userId,
            amount: reward,
            type: 'work_reward',
            balanceAfter: wallet.balance,
            reference: `${reference}:work`
        });

        return { reward, balance: wallet.balance, availableAt };
    });
}

async function transfer({ guildId, fromUserId, toUserId, amount, reference }) {
    assertPositiveInteger(amount);
    if (fromUserId === toUserId) throw new EconomyError('self_transfer');

    return runTransaction(async (session) => {
        const from = await debitWallet(guildId, fromUserId, amount, session);
        if (!from) throw new EconomyError('insufficient_funds');

        const to = await creditWallet(guildId, toUserId, amount, session);
        if (!to) throw new EconomyError('credit_failed');

        await writeLedger(session, {
            guildId,
            userId: fromUserId,
            amount: -amount,
            type: 'transfer_sent',
            balanceAfter: from.balance,
            relatedUserId: toUserId,
            reference: `${reference}:sent`
        });

        await writeLedger(session, {
            guildId,
            userId: toUserId,
            amount,
            type: 'transfer_received',
            balanceAfter: to.balance,
            relatedUserId: fromUserId,
            reference: `${reference}:received`
        });

        return { fromBalance: from.balance, toBalance: to.balance, amount };
    });
}

async function steal({ guildId, userId, targetId, reference }) {
    if (userId === targetId) throw new EconomyError('self_steal');

    const now = new Date();
    const availableAt = new Date(now.getTime() + ECONOMY.steal.cooldownMs);

    return runTransaction(async (session) => {
        // Se valida la victima antes de gastar el cooldown, y sin crearle la wallet:
        // a alguien sin monedas no se le puede robar y el intento no cuesta el cooldown.
        const targetSnapshot = await Wallet.findOne({ guildId, userId: targetId }, { balance: 1 }, { session }).lean();
        if (!targetSnapshot || targetSnapshot.balance <= 0) {
            throw new EconomyError('target_empty', { balance: targetSnapshot ? targetSnapshot.balance : 0 });
        }

        const { wallet, claimed } = await claimCooldown(
            { guildId, userId, field: 'stealAvailableAt', now, next: availableAt, reward: 0 },
            session
        );

        if (!claimed) {
            throw new EconomyError('steal_cooldown', { availableAt: wallet ? wallet.stealAvailableAt : null });
        }

        const target = await ensureWallet(guildId, targetId, session);
        if (target.balance <= 0) throw new EconomyError('target_empty', { balance: 0 });

        const ratio = randomInt(Math.round(ECONOMY.steal.minRate * 100), Math.round(ECONOMY.steal.maxRate * 100)) / 100;
        const rawAmount = Math.floor(target.balance * ratio);
        const amount = Math.min(Math.max(rawAmount, ECONOMY.steal.minAmount), ECONOMY.steal.maxAmount, target.balance);
        const fine = Math.min(Math.floor(amount * ECONOMY.steal.fineRate), ECONOMY.steal.maxFine);
        const success = Math.random() < ECONOMY.steal.successRate;

        if (success) {
            const debitedTarget = await debitWallet(guildId, targetId, amount, session);
            if (!debitedTarget) throw new EconomyError('target_empty', { balance: 0 });

            const creditedThief = await creditWallet(guildId, userId, amount, session);

            await writeLedger(session, {
                guildId,
                userId,
                amount,
                type: 'steal_gain',
                balanceAfter: creditedThief.balance,
                relatedUserId: targetId,
                reference: `${reference}:gain`
            });

            await writeLedger(session, {
                guildId,
                userId: targetId,
                amount: -amount,
                type: 'steal_loss',
                balanceAfter: debitedTarget.balance,
                relatedUserId: userId,
                reference: `${reference}:loss`
            });

            return { success: true, amount, fine: 0, balance: creditedThief.balance, availableAt };
        }

        const thief = await ensureWallet(guildId, userId, session);
        const appliedFine = Math.min(fine, thief.balance);
        let balance = thief.balance;

        if (appliedFine > 0) {
            const debited = await debitWallet(guildId, userId, appliedFine, session);
            balance = debited.balance;
            await writeLedger(session, {
                guildId,
                userId,
                amount: -appliedFine,
                type: 'steal_loss',
                balanceAfter: debited.balance,
                relatedUserId: targetId,
                reference: `${reference}:fine`
            });
        }

        return { success: false, amount: 0, fine: appliedFine, balance, availableAt };
    });
}

module.exports = {
    ECONOMY,
    EconomyError,
    isTransactionsUnsupported,
    getWallet,
    getCooldowns,
    getHistory,
    work,
    steal,
    transfer,
    ledger: { ensureWallet, creditWallet, debitWallet, writeLedger, runTransaction }
};
