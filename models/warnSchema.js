const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true }, // Asegúrate de que esto esté aquí
    reason: { type: String, required: true },
    moderatorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Warns', warnSchema);
