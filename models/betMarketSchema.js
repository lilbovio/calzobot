const mongoose = require('mongoose');

const MARKET_STATUSES = ['open', 'closed', 'settled', 'cancelled'];

const outcomeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true }
}, { _id: false });

const settlementSchema = new mongoose.Schema({
    totalPool: { type: Number, default: 0 },
    winningPool: { type: Number, default: 0 },
    losingPool: { type: Number, default: 0 },
    feeRate: { type: Number, default: 0 },
    feeAmount: { type: Number, default: 0 },
    distributable: { type: Number, default: 0 },
    payoutTotal: { type: Number, default: 0 },
    roundingRemainder: { type: Number, default: 0 },
    winnersCount: { type: Number, default: 0 },
    refundedTotal: { type: Number, default: 0 },
    refundsCount: { type: Number, default: 0 },
    note: { type: String, default: null }
}, { _id: false });

const betMarketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    marketId: { type: String, required: true },
    creatorId: { type: String, required: true },
    question: { type: String, required: true },
    description: { type: String, default: '' },
    outcomes: {
        type: [outcomeSchema],
        required: true,
        validate: {
            validator: list => Array.isArray(list) && list.length >= 2 && list.length <= 5,
            message: props => `Un mercado necesita entre 2 y 5 opciones (recibidas: ${props.value.length}).`
        }
    },
    status: { type: String, required: true, enum: MARKET_STATUSES, default: 'open' },
    wagerCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    closesAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    winningOutcomeId: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: null },
    cancellationReason: { type: String, default: null },
    settlement: { type: settlementSchema, default: () => ({}) }
});

betMarketSchema.index({ guildId: 1, marketId: 1 }, { unique: true });
betMarketSchema.index({ guildId: 1, status: 1, closesAt: 1 });

module.exports = mongoose.model('BetMarket', betMarketSchema);
