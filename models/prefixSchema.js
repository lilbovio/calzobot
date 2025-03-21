const mongoose = require('mongoose');

const prefixSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    prefix: { type: String, required: true }
});

module.exports = mongoose.model('Prefix', prefixSchema);
