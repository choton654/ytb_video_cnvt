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
import userModel from "../model/user";
import jwt, { decode } from 'jsonwebtoken';
import { validateLoginData, validateSignupData } from "../helpers/validation";
import mongoose from "mongoose";

const SOMETHING_WENT_WRONG = 'Something went wrong'
const INVALID_INFORMATION = 'Invalid information'
const AUTH_KEY_INVALID = 'Invalid auth key'
const AUTH_KEY_BLANK = 'Blank auth key'

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

export function decodeKey(key) {
  return new Promise((resolve, reject) => {
    jwt.verify(key, process.env.JWT_SECRET, (err, decoded) => {
      if (err || !decoded) return reject(false)
      resolve(decoded);
    })
  });
};

export function generateAuthKey(data) {
  return new Promise((resolve, reject) => {
    const option = { expiresIn: "3650d" };

    jwt.sign(data, process.env.JWT_SECRET, option, (err, token) => {
      if (err)
        reject({
          status: 403,
          result: {
            error: 'Error while generating auth key'
          }
        });
      resolve(token);
    });
  });
}

export function validateAuthKey(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  const authToken = bearerHeader.split(' ');
  if (!bearerHeader || authToken.length !== 2 || authToken[0] !== 'Bearer')
    return res.status(401).json({ error: AUTH_KEY_INVALID });
  const authKey = authToken[1];
  if (!authKey) return res.status(401).json({ error: AUTH_KEY_BLANK });
  decodeKey(authKey)
    .then(decoded => {
      if (!decoded || !decoded.uid) return res.status(401).json({ error: AUTH_KEY_INVALID });
      req.decoded = decoded;
      next();
    })
    .catch(err => { console.error(err); res.status(401).json({ error: AUTH_KEY_INVALID }) });
};

const saveVideoData = async (data) => {
  await audiotextsampleModel.findOneAndUpdate({ ytbId: data.videoId, title: data.title }, {
    $push: {
      segments: {
        name: data.name,
        text: data?.text
      }
    },
    url: data.url, userId: data.userId
  }, { upsert: true, new: true })
}

export const getAudio = [validateAuthKey,
  async (req, res) => {
    const userId = req.decoded.uid;
    const videoURL = req.body.url
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

      ytdl.getInfo(videoURL).then(async (info) => {
        console.log("title:", info.videoDetails.title);
        // let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        // console.log('Formats with only audio: ' + audioFormats.length);
        await audiotextsampleModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(userId), ytbId: info.videoDetails.videoId, }, { title: info.videoDetails.title, url: videoURL, userId, status: 1 }, { upsert: true, new: true })
        res.status(200).json({ msg: 'success' })

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

                        await audiotextsampleModel.findOneAndUpdate({ ytbId: videoId, userId: new mongoose.Types.ObjectId(userId) }, { summary: summary.text, status: 3 }, { new: true })
                      }


                      console.log("TASK COMPLETED!")
                      return
                    }
                    const transcription = await openai.audio.transcriptions.create({
                      model: 'whisper-1',
                      file: fs.createReadStream(path.join(process.cwd(), "public", "audio", audioFiles[n - 1])),
                    })
                    console.log('---transcription---', audioFiles[n - 1], transcription);
                    await audiotextsampleModel.findOneAndUpdate({ ytbId: info.videoDetails.videoId,userId: new mongoose.Types.ObjectId(userId)  }, {
                      $push: {
                        segments: {
                          name: audioFiles[n - 1],
                          text: transcription?.text
                        }
                      },
                      status: 2
                    }, { upsert: true, new: true })

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




      }).catch(e => {

        res.status(400).json({ msg: 'cannot convert video' })
      });


    } catch (error) {
      console.error(error);
      res.status(500).send('error')
    }
  }

];

export const signup = async (req, res) => {
  const { value, error } = validateSignupData(req.body);
  if (error) return res.status(400).send({ error: INVALID_INFORMATION });
  try {
    await userModel.findOneAndUpdate({ email: req.body.email }, req.body, { upsert: true, new: true })

    const newUser = await userModel.findOne({ email: req.body.email }).lean()
    const authKey = await generateAuthKey({ uid: newUser._id, email: newUser.email, name: newUser.firstName });
    return res.status(200).json({ msg: 'Success', user: newUser, authKey })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: SOMETHING_WENT_WRONG });

  }
}
export const login = async (req, res) => {
  const { value, error } = validateLoginData(req.body);
  if (error) return res.status(400).send({ error: INVALID_INFORMATION });
  try {

    const loginUser = await userModel.findOne({ email: req.body.email, password: req.body.password }).lean()
    if (loginUser) {
      var authKey = await generateAuthKey({ uid: loginUser._id, email: loginUser.email, name: loginUser.firstName });
      return res.status(200).json({ msg: 'Success', user: loginUser, authKey })

    } else {
      return res.status(200).json({ msg: 'User not found', })

    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: SOMETHING_WENT_WRONG });

  }
}