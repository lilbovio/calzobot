const mongoose = require('mongoose');

const LEDGER_TYPES = [
    'work_reward',
    'steal_gain',
    'steal_loss',
    'transfer_sent',
    'transfer_received',
    'bet_stake',
    'bet_refund',
    'bet_payout',
    'bet_fee'
];

const economyLedgerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, default: null },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: LEDGER_TYPES },
    balanceAfter: { type: Number, default: null },
    relatedUserId: { type: String, default: null },
    marketId: { type: String, default: null },
    reference: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

economyLedgerSchema.index({ reference: 1 }, { unique: true });
economyLedgerSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
economyLedgerSchema.index({ guildId: 1, marketId: 1 });

module.exports = mongoose.model('EconomyLedger', economyLedgerSchema);
