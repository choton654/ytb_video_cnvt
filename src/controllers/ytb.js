import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import OpenAI from "openai";
import ytdl from "ytdl-core";
import audiotextsampleModel from "../model/audioTextSample";
import { loadSummarizationChain } from "langchain/chains";
import { CharacterTextSplitter } from "langchain/text_splitter";
// import { OpenAI as OpenAILLM } from "@langchain/openai";

import path from 'path';
import cp from 'child_process';
import fs from 'fs';
import process from 'process';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// const openaillm = new OpenAILLM({
//   modelName: "gpt-3.5-turbo-instruct", // Defaults to "gpt-3.5-turbo-instruct" if no model provided.
//   temperature: 0.9,
//   openAIApiKey: process.env.OPENAI_API_KEY, // In Node.js defaults to process.env.OPENAI_API_KEY
//   maxTokens: 4000
// });
const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: "gemini-pro",
  maxOutputTokens: 2048,
});

const sourceAudio = path.join('audio.mp3')
const outputAudio = path.join('public', 'audio', 'audio-segment_%03d.mp3')
const directoryPath = path.join(process.cwd(), 'public', 'audio');


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

export const getAudio = async (req, res) => {
  const videoURL = req.body.url
  console.log(videoURL);
  console.log('---__dirname---',path.join(process.cwd()));
  try {
    const transferVideo = () => new Promise((resolve, reject) => {
      try {

        const stream = ytdl(videoURL, {
          quality: "highestaudio",
          filter: "audioonly"
        });
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
      // 1500 second segments
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
      console.log("title:", info.videoDetails.title);
      let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      console.log('Formats with only audio: ' + audioFormats.length);

      const audioFormat = info.formats.find(i => i.mimeType.startsWith("audio/mp4"))
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
                    const videoId = info.videoDetails.videoId
                    const sample = await audiotextsampleModel.findOne({ ytbId: videoId }).lean()
                    let mergeText = '';
                    sample?.segments.reverse().forEach(t => {
                      mergeText += ` ${t.text}`
                    })
                    const text_splitter = new CharacterTextSplitter({
                      separator: " ",
                      chunkSize: 3000,
                    })
                    const newDoc = await text_splitter.createDocuments([mergeText])
                    const summarizeChain = loadSummarizationChain(llm, {
                      type: "stuff",

                    });
                    // console.log('---newDoc---',newDoc);
                    const summary = await summarizeChain.invoke({
                      input_documents: newDoc,
                    });

                    if (summary.text) {
                      console.log('---summery---', summary.text);

                      await audiotextsampleModel.findOneAndUpdate({ ytbId: videoId }, { summary: summary.text }, { new: true })
                    }


                    console.log("TASK COMPLETED!")
                    return
                  }
                  const transcription = await openai.audio.transcriptions.create({
                    model: 'whisper-1',
                    file: fs.createReadStream(path.join(process.cwd(), "public", "audio", audioFiles[n - 1])),
                  })
                  console.log('---transcription---', audioFiles[n - 1], transcription);
                  await saveVideoData({
                    videoId: info.videoDetails.videoId,
                    title: info.videoDetails.title,
                    name: audioFiles[n - 1], text: transcription?.text
                  })
                  fs.unlink(path.join(process.cwd(), "public", "audio", audioFiles[n - 1]), (err) => {
                    if (err) throw err;
                  });
                  console.log("I'm doing something.")
                  doSomething(n - 1)
                }
                doSomething(loopLength)
              });
            }
            console.log('--ffmpeg value---', v?.status)
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

