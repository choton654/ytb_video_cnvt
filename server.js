const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
var cors = require("cors");
var path = require("path");
var OpenAI = require("openai");
var axios = require("axios");

const app = express();

var http = require("http").createServer(app);
const io = require("socket.io")(http);

const port = process.env.PORT || 3000;

var clientGlob = null;
// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above
const smallLink = 'https://www.youtube.com/watch?v=eZe9q1GxR8g'
const biglink = 'https://www.youtube.com/watch?v=3ha-kqV0P38'
const openai = new OpenAI({
  apiKey: ''
});
const chunkSize = 23 * 1024 * 1024;


getAudio = async (videoURL, res) => {
  console.log(videoURL);
  try {
    const transferVideo = (chunkname, start, end, isBigSize) => new Promise((resolve, reject) => {
      try {
        var stream;
        if (isBigSize) {
          console.log(start, end);
          stream = ytdl(videoURL, {
            quality: "highestaudio",
            filter: "audioonly", range: { start, end }
          });

        } else {
          stream = ytdl(videoURL, {
            quality: "highestaudio",
            filter: "audioonly"
          });
        }

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
        stream.pipe(fs.createWriteStream(chunkname));
        stream.on('finish', () => {
          resolve(chunkname)

        })

      } catch (error) {
        console.error(error);
        reject(false)
      }
    })

    ytdl.getInfo(videoURL).then((info) => {
      console.log('---video info contentLength---', info.formats[0].contentLength);
      console.log("title:", info.videoDetails.title);
      // console.log("rating:", info.player_response.videoDetails.averageRating);
      // console.log("uploaded by:", info.videoDetails.author.name);
      // clientGlob.emit("videoDetails", [
      //   info.videoDetails.title,
      //   info.videoDetails.author.name,
      //   info
      // ]);
      const totalSize = parseInt(info.formats[0].contentLength, 10);
      if (totalSize > chunkSize) {
        console.log('--greater than 24mb');
        let start = 0;
        let end = chunkSize;
        let chunkIndex = 1;

        // Download chunks until the entire video is downloaded
        for (let i = 0; i < Math.round(totalSize / chunkSize); i++) {
          const chunkname = `chunk_${chunkIndex}.mp3`
          transferVideo(chunkname, start, end, true).then(async (d) => {
            console.log(d);
            // if (d) {
              // console.log(fs.createReadStream(d));
              // const transcription = await openai.audio.transcriptions.create({
              //   model: 'whisper-1',
              //   file: fs.createReadStream(d),
              // })
              // console.log('---transcription big---', transcription);
              
            // }

          })
          start = end + 1;
          end = Math.min(start + chunkSize, totalSize);
          chunkIndex++;

        }
        // while (start < totalSize) {

        //   transferVideo(chunkname, start, end, true).then(async (d) => {
        //     console.log(d);
        //     const transcription = await openai.audio.transcriptions.create({
        //       model: 'whisper-1',
        //       file: fs.createReadStream(chunkname),
        //     })
        //     console.log('---transcription big---', transcription);

        //   })
        //   start = end + 1;
        //   end = Math.min(start + chunkSize, totalSize);
        //   chunkIndex++;
        // }

      } else {
        console.log('--less than 23mb');

        const chunkname = `chunk_1.mp3`
        transferVideo(chunkname, 0, 0, false).then(async (d) => {
          console.log(d);
          const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(chunkname),
          })
          console.log('---transcription small---', transcription);

        })
      }

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
  // const transcription = await openai.audio.transcriptions.create({
  //   model: 'whisper-1',
  //   file: fs.createReadStream('chunk_1.mp3'),
  //   maxBodyLength: 500 * 1024 * 1024,
  // })
  // console.log('---transcription---', transcription);

});

io.on("connection", (client) => {
  clientGlob = client;
  console.log("User connected");
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
