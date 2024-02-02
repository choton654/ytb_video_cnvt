import express from 'express';
import { getAudio, getSummery, getTranscript, getYtbDetails, login, signup } from '../controllers/ytb';



const Router = express.Router();

Router.post('/ytbvideo/send', getAudio)
Router.post('/user/signup', signup)
Router.post('/user/login', login)
Router.get('/user/getAudioTranscript', getTranscript)
Router.get('/user/getYtbDetails/:ytbId', getYtbDetails)
Router.get('/user/getSummery/:ytbId', getSummery)


export default Router;