const crypto = require('crypto');
const BetMarket = require('../models/betMarketSchema');
const Wager = require('../models/wagerSchema');
const economyService = require('./economyService');
const { EconomyError, ledger } = economyService;

const BET = {
    feeRate: 0.05,
    minOutcomes: 2,
    maxOutcomes: 5,
    minStake: 1,
    maxQuestionLength: 200,
    maxDescriptionLength: 1000,
    maxOutcomeLength: 50,
    maxReasonLength: 300
};

const OPEN_STATUSES = ['open', 'closed'];

function generateMarketId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function normalizeOutcomeLabel(label) {
    return String(label).trim().replace(/\s+/g, ' ');
}

function validateOutcomes(labels) {
    const cleaned = labels
        .map(normalizeOutcomeLabel)
        .filter(label => label.length > 0);

    if (cleaned.length < BET.minOutcomes) throw new EconomyError('min_outcomes');
    if (cleaned.length > BET.maxOutcomes) throw new EconomyError('max_outcomes');

    for (const label of cleaned) {
        if (label.length > BET.maxOutcomeLength) throw new EconomyError('outcome_too_long');
    }

    const seen = new Set();
    for (const label of cleaned) {
        const key = label.toLowerCase();
        if (seen.has(key)) throw new EconomyError('duplicate_outcome');
        seen.add(key);
    }

    return cleaned;
}

function sanitizeText(text) {
    return String(text).replace(/@/g, '@\u200b');
}

async function createMarket({ guildId, creatorId, question, description, outcomeLabels, closesAt }) {
    const cleanQuestion = sanitizeText(String(question).trim());
    if (cleanQuestion.length < 2) throw new EconomyError('invalid_question');
    if (cleanQuestion.length > BET.maxQuestionLength) throw new EconomyError('question_too_long');

    const cleanDescription = sanitizeText(String(description || '').trim());
    if (cleanDescription.length > BET.maxDescriptionLength) throw new EconomyError('description_too_long');

    const labels = validateOutcomes(outcomeLabels);
    if (!(closesAt instanceof Date) || Number.isNaN(closesAt.getTime())) throw new EconomyError('invalid_close_time');
    if (closesAt.getTime() <= Date.now()) throw new EconomyError('close_time_past');

    const outcomes = labels.map((label, index) => ({ id: `o${index + 1}`, label }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const marketId = generateMarketId();
        try {
            return await BetMarket.create({ guildId, marketId, creatorId, question: cleanQuestion, description: cleanDescription, outcomes, closesAt });
        } catch (err) {
            if (err && (err.code === 11000 || err.code === 11001)) continue;
            throw err;
        }
    }

    throw new EconomyError('market_id_generation_failed');
}

async function getMarket(guildId, marketId, session) {
    return BetMarket.findOne(
        { guildId, marketId: String(marketId).trim().toUpperCase() },
        null,
        { session }
    );
}

async function listMarkets(guildId, { statuses, limit = 10 } = {}) {
    const query = { guildId };
    if (statuses && statuses.length) query.status = { $in: statuses };
    return BetMarket.find(query).sort({ createdAt: -1 }).limit(limit);
}

async function searchMarkets(guildId, query, { statuses, limit = 25 } = {}) {
    const filter = { guildId };
    if (statuses && statuses.length) filter.status = { $in: statuses };
    const value = String(query || '').trim().toUpperCase();
    if (value) filter.marketId = { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    return BetMarket.find(filter).sort({ createdAt: -1 }).limit(limit);
}

async function getPools(guildId, marketId) {
    const rows = await Wager.aggregate([
        { $match: { guildId, marketId } },
        { $group: { _id: '$outcomeId', total: { $sum: '$stake' }, bettors: { $sum: 1 } } }
    ]);

    const pools = new Map();
    let totalPool = 0;
    for (const row of rows) {
        pools.set(row._id, { total: row.total, bettors: row.bettors });
        totalPool += row.total;
    }
    return { pools, totalPool };
}

async function getPoolsForMarkets(guildId, marketIds) {
    if (!marketIds.length) return new Map();

    const rows = await Wager.aggregate([
        { $match: { guildId, marketId: { $in: marketIds } } },
        { $group: { _id: { marketId: '$marketId', outcomeId: '$outcomeId' }, total: { $sum: '$stake' }, bettors: { $sum: 1 } } }
    ]);

    const result = new Map();
    for (const marketId of marketIds) result.set(marketId, { pools: new Map(), totalPool: 0 });

    for (const row of rows) {
        const entry = result.get(row._id.marketId);
        entry.pools.set(row._id.outcomeId, { total: row.total, bettors: row.bettors });
        entry.totalPool += row.total;
    }
    return result;
}

function estimatePayout(stake, winningPool, losingPool, feeRate = BET.feeRate) {
    if (winningPool <= 0) return null;
    const fee = Math.floor(losingPool * feeRate);
    const distributable = losingPool - fee;
    return stake + Math.floor((stake / winningPool) * distributable);
}

async function placeWager({ guildId, marketId, userId, outcomeId, amount, reference }) {
    if (!Number.isInteger(amount) || amount < BET.minStake) throw new EconomyError('invalid_amount');

    return ledger.runTransaction(async (session) => {
        const market = await getMarket(guildId, marketId, session);
        if (!market) throw new EconomyError('market_not_found');
        if (market.status !== 'open') throw new EconomyError('market_not_open');
        if (market.closesAt.getTime() <= Date.now()) throw new EconomyError('market_closed');

        const outcome = market.outcomes.find(item => item.id === outcomeId);
        if (!outcome) throw new EconomyError('invalid_outcome');

        const claim = await BetMarket.updateOne(
            { _id: market._id, status: 'open', closesAt: { $gt: new Date() } },
            { $inc: { wagerCount: 1 } },
            { session }
        );
        if (claim.matchedCount !== 1) throw new EconomyError('market_not_open');

        const existing = await Wager.findOne({ guildId, marketId: market.marketId, userId }, null, { session });
        if (existing && existing.outcomeId !== outcome.id) throw new EconomyError('outcome_locked');

        const wallet = await ledger.debitWallet(guildId, userId, amount, session);
        if (!wallet) throw new EconomyError('insufficient_funds');

        let wager;
        if (existing) {
            wager = await Wager.findOneAndUpdate(
                { _id: existing._id },
                { $inc: { stake: amount }, $set: { updatedAt: new Date() } },
                { new: true, session }
            );
        } else {
            const created = await Wager.create([{
                guildId,
                marketId: market.marketId,
                userId,
                outcomeId: outcome.id,
                stake: amount
            }], { session });
            wager = created[0];
        }

        await ledger.writeLedger(session, {
            guildId,
            userId,
            amount: -amount,
            type: 'bet_stake',
            balanceAfter: wallet.balance,
            marketId: market.marketId,
            reference: `${reference}:stake`
        });

        return { market, outcome, wager, totalStake: wager.stake, balance: wallet.balance };
    });
}

async function closeMarket({ guildId, marketId, staffId }) {
    const market = await getMarket(guildId, marketId);
    if (!market) throw new EconomyError('market_not_found');
    if (market.status !== 'open') throw new EconomyError('market_not_open');

    const updated = await BetMarket.findOneAndUpdate(
        { _id: market._id, status: 'open' },
        { $set: { status: 'closed', closedAt: new Date() } },
        { new: true }
    );
    if (!updated) throw new EconomyError('market_not_open');

    const { totalPool } = await getPools(guildId, updated.marketId);
    return { market: updated, totalPool, by: staffId };
}

async function refundAll(session, market, wagers) {
    const totals = new Map();
    for (const wager of wagers) {
        totals.set(wager.userId, (totals.get(wager.userId) || 0) + wager.stake);
    }

    let refundedTotal = 0;
    let refundsCount = 0;
    for (const [userId, amount] of totals) {
        const wallet = await ledger.creditWallet(market.guildId, userId, amount, session);
        await ledger.writeLedger(session, {
            guildId: market.guildId,
            userId,
            amount,
            type: 'bet_refund',
            balanceAfter: wallet.balance,
            marketId: market.marketId,
            reference: `refund:${market.marketId}:${userId}`
        });
        refundedTotal += amount;
        refundsCount += 1;
    }

    return { refundedTotal, refundsCount };
}

async function resolveMarket({ guildId, marketId, outcomeId, staffId }) {
    return ledger.runTransaction(async (session) => {
        const market = await getMarket(guildId, marketId, session);
        if (!market) throw new EconomyError('market_not_found');
        if (!OPEN_STATUSES.includes(market.status)) throw new EconomyError('already_settled');
        if (market.creatorId === staffId) throw new EconomyError('creator_cannot_resolve');

        const outcome = market.outcomes.find(item => item.id === outcomeId);
        if (!outcome) throw new EconomyError('invalid_outcome');

        const wagers = await Wager.find({ guildId, marketId: market.marketId }, null, { session }).lean();
        const totalPool = wagers.reduce((sum, wager) => sum + wager.stake, 0);
        const winningPool = wagers
            .filter(wager => wager.outcomeId === outcome.id)
            .reduce((sum, wager) => sum + wager.stake, 0);
        const losingPool = totalPool - winningPool;

        if (winningPool <= 0) {
            const refunds = await refundAll(session, market, wagers);
            const claimed = await BetMarket.findOneAndUpdate(
                { _id: market._id, status: { $in: OPEN_STATUSES } },
                {
                    $set: {
                        status: 'cancelled',
                        resolvedAt: new Date(),
                        resolvedBy: staffId,
                        winningOutcomeId: outcome.id,
                        cancelledAt: new Date(),
                        cancelledBy: staffId,
                        cancellationReason: 'Sin apuestas en la opcion ganadora, se devolvieron todas las apuestas.',
                        settlement: { totalPool, winningPool, losingPool, ...refunds }
                    }
                },
                { new: true, session }
            );
            if (!claimed) throw new EconomyError('already_settled');
            return { refunded: true, reason: 'no_winning_wagers', market: claimed, totalPool, ...refunds };
        }

        const fundedOutcomes = new Set(wagers.map(wager => wager.outcomeId));
        if (fundedOutcomes.size <= 1) {
            const refunds = await refundAll(session, market, wagers);
            const claimed = await BetMarket.findOneAndUpdate(
                { _id: market._id, status: { $in: OPEN_STATUSES } },
                {
                    $set: {
                        status: 'cancelled',
                        resolvedAt: new Date(),
                        resolvedBy: staffId,
                        winningOutcomeId: outcome.id,
                        cancelledAt: new Date(),
                        cancelledBy: staffId,
                        cancellationReason: 'Todas las apuestas cayeron en una sola opcion, se devolvieron sin cobrar comision.',
                        settlement: { totalPool, winningPool, losingPool, ...refunds }
                    }
                },
                { new: true, session }
            );
            if (!claimed) throw new EconomyError('already_settled');
            return { refunded: true, reason: 'single_outcome', market: claimed, totalPool, ...refunds };
        }

        const feeAmount = Math.floor(losingPool * BET.feeRate);
        const distributable = losingPool - feeAmount;

        const winnerTotals = new Map();
        for (const wager of wagers) {
            if (wager.outcomeId !== outcome.id) continue;
            winnerTotals.set(wager.userId, (winnerTotals.get(wager.userId) || 0) + wager.stake);
        }

        let payoutTotal = 0;
        for (const [userId, stake] of winnerTotals) {
            const payout = stake + Math.floor((stake / winningPool) * distributable);
            const wallet = await ledger.creditWallet(guildId, userId, payout, session);
            payoutTotal += payout;
            await ledger.writeLedger(session, {
                guildId,
                userId,
                amount: payout,
                type: 'bet_payout',
                balanceAfter: wallet.balance,
                marketId: market.marketId,
                reference: `settle:${market.marketId}:${userId}`
            });
        }

        if (feeAmount > 0) {
            await ledger.writeLedger(session, {
                guildId,
                userId: null,
                amount: -feeAmount,
                type: 'bet_fee',
                balanceAfter: null,
                marketId: market.marketId,
                reference: `fee:${market.marketId}`
            });
        }

        const settlement = {
            totalPool,
            winningPool,
            losingPool,
            feeRate: BET.feeRate,
            feeAmount,
            distributable,
            payoutTotal,
            roundingRemainder: distributable - (payoutTotal - winningPool),
            winnersCount: winnerTotals.size,
            refundedTotal: 0,
            refundsCount: 0,
            note: null
        };

        const claimed = await BetMarket.findOneAndUpdate(
            { _id: market._id, status: { $in: OPEN_STATUSES } },
            {
                $set: {
                    status: 'settled',
                    resolvedAt: new Date(),
                    resolvedBy: staffId,
                    winningOutcomeId: outcome.id,
                    closedAt: market.closedAt || new Date(),
                    settlement
                }
            },
            { new: true, session }
        );
        if (!claimed) throw new EconomyError('already_settled');

        return { refunded: false, market: claimed, settlement, outcome };
    });
}

async function cancelMarket({ guildId, marketId, staffId, reason }) {
    const cleanReason = String(reason || '').trim();
    if (cleanReason.length < 3) throw new EconomyError('reason_required');
    if (cleanReason.length > BET.maxReasonLength) throw new EconomyError('reason_too_long');

    return ledger.runTransaction(async (session) => {
        const market = await getMarket(guildId, marketId, session);
        if (!market) throw new EconomyError('market_not_found');
        if (!OPEN_STATUSES.includes(market.status)) throw new EconomyError('already_settled');

        const wagers = await Wager.find({ guildId, marketId: market.marketId }, null, { session }).lean();
        const totalPool = wagers.reduce((sum, wager) => sum + wager.stake, 0);
        const refunds = await refundAll(session, market, wagers);

        const claimed = await BetMarket.findOneAndUpdate(
            { _id: market._id, status: { $in: OPEN_STATUSES } },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelledBy: staffId,
                    cancellationReason: cleanReason,
                    closedAt: market.closedAt || new Date(),
                    settlement: { totalPool, refundedTotal: refunds.refundedTotal, refundsCount: refunds.refundsCount, note: cleanReason }
                }
            },
            { new: true, session }
        );
        if (!claimed) throw new EconomyError('already_settled');

        return { market: claimed, totalPool, ...refunds };
    });
}

module.exports = {
    BET,
    EconomyError,
    estimatePayout,
    createMarket,
    getMarket,
    listMarkets,
    searchMarkets,
    getPools,
    getPoolsForMarkets,
    placeWager,
    closeMarket,
    resolveMarket,
    cancelMarket
};
