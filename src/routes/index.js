import express from 'express';
import { getAudio } from '../controllers/ytb';



const Router = express.Router();

Router.post('/ytbvideo/send', getAudio)


export default Router;