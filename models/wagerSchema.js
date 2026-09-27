const mongoose = require('mongoose');

const wagerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    marketId: { type: String, required: true },
    userId: { type: String, required: true },
    outcomeId: { type: String, required: true },
    stake: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

wagerSchema.index({ guildId: 1, marketId: 1, userId: 1 }, { unique: true });
wagerSchema.index({ guildId: 1, marketId: 1, outcomeId: 1 });

module.exports = mongoose.model('Wager', wagerSchema);
