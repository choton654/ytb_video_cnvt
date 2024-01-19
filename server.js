const fs = require("fs");
const ytdl = require("ytdl-core");
const express = require("express");
var cors = require("cors");
var path = require("path");
var OpenAI = require("openai");
var axios = require("axios");
const cp = require('child_process');
const app = express();
const { mongodbConnect } = require('./db/index');
const audiotextsampleModel = require("./model/audioTextSample");
var http = require("http").createServer(app);
const io = require("socket.io")(http);

//langchain
const { loadSummarizationChain , LLMChain} = require("langchain/chains");
const { SearchApiLoader } = require("langchain/document_loaders/web/searchapi");
const { TokenTextSplitter } = require("langchain/text_splitter");
const { PromptTemplate } = require("langchain/prompts");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

require('dotenv').config()
const port = process.env.PORT || 3000;
mongodbConnect()
var clientGlob = null;
// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above
// const smallLink = 'https://www.youtube.com/watch?v=nT6Be1Bqfoc'
// const biglink = 'https://www.youtube.com/watch?v=QO66N1LrNCg'
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const sourceAudio = path.join('audio.mp3')
const outputAudio = path.join('public', 'audio', 'audio-segment_%03d.mp3')
const directoryPath = path.join(__dirname, 'public', 'audio');

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const llm = genAI.getGenerativeModel({ model: "gemini-pro" });
const llm = new ChatGoogleGenerativeAI({
  apiKey:process.env.GEMINI_API_KEY,
  modelName: "gemini-pro",
  maxOutputTokens: 2048,
});

const saveVideoData = async (data) => {
  await audiotextsampleModel.findOneAndUpdate({ ytbId: data.videoId, title: data.title }, {
    $push: {
      segments: {
        name: data.name,
        text: data?.text
      }
    }
  }, { upsert: true, new: true })
}

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
      const sCommand = `ffmpeg -i "${sourceAudio}" -f segment -segment_time 300 ${outputAudio}`

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
      // console.log('---video info---', info);
      console.log("title:", info.videoDetails.title);
      // console.log("rating:", info.player_response.videoDetails.averageRating);
      // console.log("uploaded by:", info.videoDetails.author.name);
      let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      console.log('Formats with only audio: ' + audioFormats.length);
      clientGlob.emit("videoDetails", [
        info.videoDetails.title,
        info.videoDetails.author.name,
        info.videoDetails.videoId
      ]);
      const audioFormat = info.formats.find(i => i.mimeType.startsWith("audio/mp4"))
      // const totalSize = parseInt(audioFormat.contentLength, 10);
      const totalSize = parseInt(audioFormat.approxDurationMs, 10);
      console.log('---duration in MS---', totalSize);
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
                  if (n === 0) {
                    fs.unlink('audio.mp3', (err) => {
                      if (err) throw err;
                    })
                    // await getSummerizeData(info.videoDetails.videoId)
                    console.log("TASK COMPLETED!")
                    return
                  }
                  const transcription = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    file: fs.createReadStream(path.join(__dirname, "public", "audio", audioFiles[n - 1])),
                  })
                  console.log('---transcription---', audioFiles[n - 1], transcription);
                  await saveVideoData({
                    videoId: info.videoDetails.videoId,
                    title: info.videoDetails.title,
                    name: audioFiles[n - 1], text: transcription?.text
                  })
                  fs.unlink(path.join(__dirname, "public", "audio", audioFiles[n - 1]), (err) => {
                    if (err) throw err;
                  });
                  console.log("I'm doing something.")
                  doSomething(n - 1)
                }
                doSomething(loopLength)
              });
            }
            console.log('--ffmpeg value---', v.status)
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

app.get("/getSummerizeData", async (req, res) => {
  try {
    const { videoId } = req.query
    const sample = await audiotextsampleModel.findOne({ ytbId: videoId }).lean()
    let mergeText = '';
    sample.segments.reverse().forEach(t => {
      mergeText += ` ${t.text}`
    })
    console.log('----mergeText---', mergeText);
   
   

    // const splitter = new TokenTextSplitter({
    //   chunkSize: 10000,
    //   chunkOverlap: 250,
    // });

    // const docsSummary = await splitter.splitDocuments(docs);

   

    const summaryTemplate = `
    You are an expert in summarizing YouTube videos.
    Your goal is to create a summary of a podcast.
    Below you find the transcript of a podcast:
    --------
    {text}
    --------
    
    The transcript of the podcast will also be used as the basis for a question and answer bot.
    Provide some examples questions and answers that could be asked about the podcast. Make these questions very specific.
    
    Total output will be a summary of the video and a list of example questions the user could ask of the video.
    
    SUMMARY AND QUESTIONS:
    `;

    const SUMMARY_PROMPT = PromptTemplate.fromTemplate(summaryTemplate);

    const summaryRefineTemplate = `
    You are an expert in summarizing YouTube videos.
    Your goal is to create a summary of a podcast.
    We have provided an existing summary up to a certain point: {existing_answer}
    
    Below you find the transcript of a podcast:
    --------
    {text}
    --------
    
    Given the new context, refine the summary and example questions.
    The transcript of the podcast will also be used as the basis for a question and answer bot.
    Provide some examples questions and answers that could be asked about the podcast. Make
    these questions very specific.
    If the context isn't useful, return the original summary and questions.
    Total output will be a summary of the video and a list of example questions the user could ask of the video.
    
    SUMMARY AND QUESTIONS:
    `;

    const SUMMARY_REFINE_PROMPT = PromptTemplate.fromTemplate(
      summaryRefineTemplate
    );
    const summarizeChain = loadSummarizationChain(llm, {
      type: "refine",
      verbose: true,
      questionPrompt: SUMMARY_PROMPT,
      refinePrompt: SUMMARY_REFINE_PROMPT,

    });

    // const summary = await summarizeChain.invoke(mergeText);
    const summary = await SUMMARY_PROMPT.invoke({text:mergeText})

    console.log(summary);
    await audiotextsampleModel.findOneAndUpdate({ ytbId: videoId },{summary},{new:true})
    res.status(200).json({summary, mergeText })
  } catch (error) {
    console.error(error);
    res.status(500).send('error')
  }
});

app.post("/", async (req, res) => {

  // getAudio(req.body.url, res);
  res.end()
});

io.on("connection", (client) => {
  clientGlob = client;
  console.log("User connected");
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});