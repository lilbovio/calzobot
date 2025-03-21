/* const mongoose = require('mongoose');

const { ChannelType } = require('discord.js');

const messageSchema = new mongoose.Schema({
    channelID: String,
    channelName: String,
    channelType: { type: String, enum: Object.values(ChannelType) },
    guildID: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
*/