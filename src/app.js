const express = require("express");
var cors = require("cors");
const app = express();
const { mongodbConnect } = require('./db/index');
var http = require("http").createServer(app);

import routes from './routes';

require('dotenv').config()
const port = process.env.PORT || 3000;
mongodbConnect()

// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above
// const smallLink = 'https://www.youtube.com/watch?v=nT6Be1Bqfoc'
// const biglink = 'https://www.youtube.com/watch?v=QO66N1LrNCg'

app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies
app.use(cors());
app.use("/api/", routes);

app.post("/", async (req, res) => {

  res.end('test')
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});