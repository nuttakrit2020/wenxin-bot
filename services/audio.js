const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Generates an M4A audio file using Google TTS and fluent-ffmpeg
 * @param {string} text Text to synthesize
 * @param {string} langCode Language code (e.g. zh-CN)
 * @returns {Promise<{audioUrl: string, durationMs: number}>}
 */
const generateAudioMessage = (text, langCode, tunnelBaseUrl) => {
  return new Promise((resolve, reject) => {
    // We use google TTS API.
    // It can handle up to ~200 characters natively per request
    const safeText = text.substring(0, 150); 
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${langCode}&client=tw-ob`;
    
    const filename = `audio_${Date.now()}.m4a`;
    const audioDir = path.join(__dirname, '..', 'public', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    const outputPath = path.join(audioDir, filename);

    ffmpeg(ttsUrl)
      .outputOptions([
        '-c:a aac',
        '-b:a 64k',
        '-movflags +faststart'
      ])
      .toFormat('mp4')
      .on('end', () => {
        // Assume default ~3 seconds for average message if we can't probe easily
        // Or we can just probe it
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          let durationMs = 3000;
          if (!err && metadata && metadata.format && metadata.format.duration) {
            durationMs = Math.round(metadata.format.duration * 1000);
          }
          
          const audioUrl = `${tunnelBaseUrl}/public/audio/${filename}`;
          resolve({ audioUrl, durationMs });
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .save(outputPath);
  });
};

module.exports = {
  generateAudioMessage
};
