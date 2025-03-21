const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageID: String,
    content: String,
    authorID: String,
    authorTag: String,
    channelID: String,
    guildID: String/*,
    timestamp: { type: Date, default: Date.now }*/
});

module.exports = mongoose.model('Message', messageSchema);
