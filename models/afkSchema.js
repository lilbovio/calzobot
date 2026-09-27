const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    reason: { type: String, default: "Sin razón", maxlength: 300 },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AFK", afkSchema);
