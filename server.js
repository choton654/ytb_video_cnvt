const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
var cors = require("cors");
var path = require("path");
var OpenAI = require("openai");
var axios = require("axios");
const cp = require('child_process');
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
const sourceAudio = path.join('audio.mp3')
const outputAudio = path.join('public', 'audio', 'audio-segment_%03d.mp3')
const directoryPath = path.join(__dirname, 'public', 'audio');

getAudio = async (videoURL, res) => {
  console.log(videoURL);
  try {
    const transferVideo = () => new Promise((resolve, reject) => {
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
           
                if (err) {
                  return console.log('Unable to scan directory: ' + err);
                }
                const audioFiles = files.filter(f => f.startsWith('audio-segment'))
                const loopLength = audioFiles.length
                async function doSomething(n) {
                  if(n === 0) {
                    fs.unlink('audio.mp3',(err) => {
                      if (err) throw err;
                    })
                    console.log("TASK COMPLETED!")
                    return
                  }
                  const transcription = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    file: fs.createReadStream(path.join(__dirname, "public", "audio", audioFiles[n-1])),
                  })
                  console.log('---transcription---',audioFiles[n-1],transcription);
                  fs.unlink(path.join(__dirname, "public", "audio", audioFiles[n-1]), (err) => {
                    if (err) throw err;
                  });
                  console.log("I'm doing something.")
                  doSomething(n - 1)
                }
                doSomething(loopLength)
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