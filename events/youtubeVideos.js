const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');

let lastVideoId = null;

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const videosChannel = client.channels.cache.get(config.videosChannel);
    if (!videosChannel) {
      console.error('❌ Canal de videos no encontrado.');
      return;
    }

    setInterval(async () => {
      try {
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${config.youtubeChannelId}&maxResults=1&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );

        const latestVideo = response.data.items[0];
        if (!latestVideo) return;

        const videoId = latestVideo.id.videoId;
        if (videoId === lastVideoId) return;
        lastVideoId = videoId;

        const embed = new EmbedBuilder()
          .setTitle('📺 ¡Calzoski subió un nuevo video!')
          .setDescription('[Haz clic aquí para verlo](https://www.youtube.com/watch?v=' + videoId + ')')
          .setColor('Red')
          .setTimestamp();

        await videosChannel.send({ content: `@everyone`, embeds: [embed] });
      } catch (error) {
        console.error('Error al verificar nuevos videos de YouTube:', error);
      }
    }, 5 * 60 * 1000); // Verifica cada 5 minutos
  },
};
