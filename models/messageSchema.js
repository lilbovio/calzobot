const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageID: String,
    content: String,
    authorID: String,
    authorTag: String,
    channelID: String,
    channelName: String,
    guildID: String
});

module.exports = mongoose.model('Message', messageSchema);
