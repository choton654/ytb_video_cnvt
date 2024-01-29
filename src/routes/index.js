import express from 'express';
import { getAudio, login, signup } from '../controllers/ytb';



const Router = express.Router();

Router.post('/ytbvideo/send', getAudio)
Router.post('/user/signup', signup)
Router.post('/user/login', login)


export default Router;