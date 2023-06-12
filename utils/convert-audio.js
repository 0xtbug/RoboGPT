const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const convertAudio = (filePath, format = 'mp3') => {
  return new Promise((resolve, reject) => {
    const formats = {
      mp3: {
        codec: 'libmp3lame',
        ext: 'mp3',
      },
      ogg: {
        codec: 'libvorbis',
        ext: 'ogg',
      },
    };

    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, path.extname(filePath))}.${formats[format].ext}`
    );

        ffmpeg(oggPath)
        .toFormat("wav")
        .outputOptions("-acodec pcm_s16le")
        .output(wavPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
};

module.exports = { convertAudio };