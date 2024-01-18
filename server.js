const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
var cors = require("cors");
var path = require("path");
var OpenAI = require("openai");
var axios = require("axios");
const cp = require('child_process');
const readline = require('readline');
const app = express();

var http = require("http").createServer(app);
const io = require("socket.io")(http);

const port = process.env.PORT || 3000;

var clientGlob = null;
// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above
// const smallLink = 'https://www.youtube.com/watch?v=nT6Be1Bqfoc'
// const biglink = 'https://www.youtube.com/watch?v=QO66N1LrNCg'
const openai = new OpenAI({
  apiKey: ''
});
// const chunkSize = 1000;
// const chunkSize = 23 * 1024 * 1024;
// const tracker = {
//   start: Date.now(),
//   audio: { downloaded: 0, total: Infinity },
//   video: { downloaded: 0, total: Infinity },
//   merged: { frame: 0, speed: '0x', fps: 0 },
// };
const sourceAudio = path.join('audio.mp3')
const outputAudio = path.join('public', 'audio', 'audio-segment_%03d.mp3')
const directoryPath = path.join(__dirname, 'public', 'audio');

getAudio = async (videoURL, res) => {
  console.log(videoURL);
  try {
    const transferVideo = (chunkname, start, end, isBigSize) => new Promise((resolve, reject) => {
      try {

        const stream = ytdl(videoURL, {
          quality: "highestaudio",
          filter: "audioonly"
        });
        // stream.on("progress", (chunkSize, downloadedChunk, totalChunk) => {
        //   // console.log(downloadedChunk, totalChunk);
        //   clientGlob.emit("progressEventSocket", [
        //     (downloadedChunk * 100) / totalChunk,
        //   ]);
        //   clientGlob.emit("downloadCompletedServer", [downloadedChunk]);
        //   if (downloadedChunk == totalChunk) {
        //     console.log("Downloaded");
        //   }
        // })
        // .pipe(res);
        stream.pipe(fs.createWriteStream("audio.mp3"));
        stream.on('finish', () => {
          resolve(true)

        })

      } catch (error) {
        console.error(error);
        reject(false)
      }
    })




    const ret = () => new Promise((resolve, reject) => {
      // 300 second segments
      const sCommand = `ffmpeg -i "${sourceAudio}" -f segment -segment_time 1500 ${outputAudio}`

      cp.exec(sCommand, (error, stdout, stderr) => {

        if (error) {
          console.error('---ffm error---', error);
          resolve({
            status: 'error',
          })

        } else {

          resolve({
            status: 'success',
            error: stderr,
            out: stdout,
          })

        }

      })

    })



    ytdl.getInfo(videoURL).then((info) => {
      console.log('---video info contentLength---', info.formats[0].contentLength);
      console.log("title:", info.videoDetails.title);
      // console.log("rating:", info.player_response.videoDetails.averageRating);
      // console.log("uploaded by:", info.videoDetails.author.name);
      let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      console.log('Formats with only audio: ' + audioFormats.length);
      clientGlob.emit("videoDetails", [
        info.videoDetails.title,
        info.videoDetails.author.name,
        audioFormats
      ]);
      const audioFormat = info.formats.find(i => i.mimeType.startsWith("audio/mp4"))
      // const totalSize = parseInt(audioFormat.contentLength, 10);
      const totalSize = parseInt(audioFormat.approxDurationMs, 10);
      console.log('---totalSize---', totalSize);
      transferVideo().then((d) => {
        if (d) {
          ret().then(v => {
            if (v.status === 'success') {
              fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                  return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                const audioFiles = files.filter(f => f.startsWith('audio-segment'))
                audioFiles.forEach(async function (file) {
                  // Do whatever you want to do with the file
                  // console.log('---runn---',file);
                  const transcription = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    // file: fs.createReadStream('audio.mp3'),
                    file: fs.createReadStream(path.join(__dirname, "public", "audio", file)),
                  })
                  console.log('---transcription---', file,transcription);


                });
              });
            }
            console.log('--ffmpeg value---', v)
          }).catch((e) => console.error('---ffmpeg error---', e))

        }
      })




    });

    res.status(200).send('success')

  } catch (error) {
    console.error(error);
    res.status(500).send('error')
  }
};

app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies
app.use(cors());

app.use(express.static(path.join(__dirname, "client", "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "client", "index.html"));
});

app.post("/", async (req, res) => {

  getAudio(req.body.url, res);
});

io.on("connection", (client) => {
  clientGlob = client;
  console.log("User connected");
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});


// var stream;
// if (isBigSize) {
//   console.log(start, end);
//   stream = ytdl(videoURL, {
//     quality: "highestaudio",
//     filter: "audioonly", range: { start, end }
//   });

// } else {
//   stream = ytdl(videoURL, {
//     quality: "highestaudio",
//     filter: "audioonly"
//   });
// }

//   const audio = ytdl(videoURL, { quality: 'highestaudio' })
//     .on('progress', (_, downloaded, total) => {
//       console.log(downloaded, total);
//       tracker.audio = { downloaded, total };
//     });
//     const video = ytdl(videoURL, { quality: 'highestvideo' })
//   .on('progress', (_, downloaded, total) => {
//   tracker.video = { downloaded, total };
// });
//   let progressbarHandle = null;
//   const progressbarInterval = 1000;
//   const showProgress = () => {
//     readline.cursorTo(process.stdout, 0);
//     const toMB = i => (i / 1024 / 1024).toFixed(2);

//     process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
//     process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);

//     process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
//     process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);

//     process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
//     process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);

//     process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
//     readline.moveCursor(process.stdout, 0, -3);
//   };

//   // Start the ffmpeg child process
//   const ffmpegProcess = cp.spawn(ffmpeg, [
//     // Remove ffmpeg's console spamming
//     '-loglevel', '8', '-hide_banner',
//     // Redirect/Enable progress messages
//     '-progress', 'pipe:3',
//     // Set inputs
//     '-i', 'pipe:4',
//     '-i', 'pipe:5',
//     // Map audio & video from streams
//     '-map', '0:a',
//     '-map', '1:v',
//     // Keep encoding
//     '-c:v', 'copy',
//     // Define output file
//     'out.mkv',
//   ], {
//     windowsHide: true,
//     stdio: [
//       /* Standard: stdin, stdout, stderr */
//       'inherit', 'inherit', 'inherit',
//       /* Custom: pipe:3, pipe:4, pipe:5 */
//       'pipe', 'pipe', 'pipe',
//     ],
//   });
//   ffmpegProcess.on('close', () => {
//     console.log('done');
//     // Cleanup
//     process.stdout.write('\n\n\n\n');
//     clearInterval(progressbarHandle);
//   });

//   // Link streams
//   // FFmpeg creates the transformer streams and we just have to insert / read data
//   ffmpegProcess.stdio[3].on('data', chunk => {
//     // Start the progress bar
//     if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval);
//     // Parse the param=value list returned by ffmpeg
//     const lines = chunk.toString().trim().split('\n');
//     const args = {};
//     for (const l of lines) {
//       const [key, value] = l.split('=');
//       args[key.trim()] = value.trim();
//     }
//     tracker.merged = args;
//   });
//   audio.pipe(ffmpegProcess.stdio[4]);
//   video.pipe(ffmpegProcess.stdio[5]);


// if (totalSize > chunkSize) {
//   console.log('--greater than 24mb');
//   let start = 0;
//   let end = chunkSize;
//   let chunkIndex = 1;

//   // Download chunks until the entire video is downloaded
//   for (let i = 0; i < Math.round(totalSize / chunkSize); i++) {
//     const chunkname = `chunk_${chunkIndex}.mp3`
//     transferVideo(chunkname, start, end, true).then(async (d) => {
//       console.log(d);
//       // if (d) {
//       //   console.log(fs.createReadStream(d));
//       //   const transcription = await openai.audio.transcriptions.create({
//       //     model: 'whisper-1',
//       //     file: fs.createReadStream(d),
//       //   })
//       //   console.log('---transcription big---', transcription);

//       // }

//     })
//     start = end + 1;
//     end = Math.min(start + chunkSize, totalSize);
//     chunkIndex++;

//   }


// } else {
//   console.log('--less than 23mb');

//   const chunkname = `chunk_1.mp3`
//   transferVideo(chunkname, 0, 0, false).then(async (d) => {
//     console.log(d);
//     // const transcription = await openai.audio.transcriptions.create({
//     //   model: 'whisper-1',
//     //   file: fs.createReadStream(chunkname),
//     // })
//     // console.log('---transcription small---', transcription);

//   })
// }