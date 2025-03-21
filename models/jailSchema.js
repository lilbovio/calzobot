const mongoose = require('mongoose');

const jailSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    rolesPrevios: { type: [String], required: true },
    razon: { type: String, default: 'No especificada' },
    liberacion: { type: Number, required: true }
});

module.exports = mongoose.model('Jail', jailSchema);