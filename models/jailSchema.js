const mongoose = require('mongoose');

const jailSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    rolesPrevios: { type: [String], required: true },
    razon: { type: String, default: 'No especificada' },
    liberacion: { type: Date, required: true },
    activo: { type: Boolean, default: true },
    timesJailed: { type: Number, default: 1 } // Nuevo campo para contar los jail
});

module.exports = mongoose.model('Jail', jailSchema);