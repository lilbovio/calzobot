const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');

let lastVideoId = null;

async function fetchLatestVideo() {
  // La key vive en el entorno, no en config.json: antes se leia de ahi y
  // terminaba enviando "key=undefined", que YouTube responde con HTTP 400.
  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      channelId: config.youtubeChannelId,
      maxResults: 1,
      order: 'date',
      type: 'video',
      key: process.env.YOUTUBE_API_KEY
    },
    timeout: 10000
  });

  return response.data.items?.[0];
}

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const videosChannel = client.channels.cache.get(config.videosChannel);
    if (!videosChannel) {
      console.error('❌ Canal de videos no encontrado.');
      return;
    }

    if (!process.env.YOUTUBE_API_KEY) {
      console.error('❌ Falta YOUTUBE_API_KEY en el .env. No se van a avisar los videos nuevos.');
      return;
    }

    const avisar = async () => {
      try {
        const latestVideo = await fetchLatestVideo();
        if (!latestVideo) return;

        const videoId = latestVideo.id?.videoId;
        if (!videoId || videoId === lastVideoId) return;
        lastVideoId = videoId;

        const embed = new EmbedBuilder()
          .setTitle('📺 ¡Calzoski subió un nuevo video!')
          .setDescription('[Haz clic aquí para verlo](https://www.youtube.com/watch?v=' + videoId + ')')
          .setColor('Red')
          .setTimestamp();

        await videosChannel.send({ embeds: [embed] });
      } catch (error) {
        // Solo el mensaje de la API: volcar el AxiosError entero llena el log
        // de ruido cada 5 minutos y esconde la causa real.
        const apiError = error.response?.data?.error;
        if (apiError) {
          console.error(`Error de la API de YouTube (${error.response.status}): ${apiError.message}`);
        } else {
          console.error('No se pudo consultar YouTube:', error.message);
        }
      }
    };

    await avisar();
    setInterval(avisar, 5 * 60 * 1000);
  },
};
