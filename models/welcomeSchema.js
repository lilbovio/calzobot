const mongoose = require('mongoose');

const welcomeSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    message: { type: String, required: true },
    image: { type: Boolean, default: false }
});

module.exports = mongoose.model('Welcome', welcomeSchema);

