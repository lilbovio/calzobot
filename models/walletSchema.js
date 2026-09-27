const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    workAvailableAt: { type: Date, default: null },
    stealAvailableAt: { type: Date, default: null }
}, { timestamps: true });

walletSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
