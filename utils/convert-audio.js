const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
const path = require('path')

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const convertAudio = async (filePath = null, format = 'mp3') => {
  const formats = {
    mp3: {
      codec: 'libmp3lame',
      ext: 'mp3',
    },
    ogg: {
      codec: 'libvorbis',
      ext: 'ogg',
    },
  }

  const outputPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}.${formats[format].ext}`
  )

  await new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .audioCodec(formats[format].codec)
      .audioBitrate('64k')
      .format(formats[format].ext)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })

  return outputPath
}

module.exports = { convertAudio }