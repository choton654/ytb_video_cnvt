const mongoose = require("mongoose");


const mongodbConnect = () => {
    const options = { useNewUrlParser: true, useUnifiedTopology: true };
    
    mongoose.connect(process.env.MONGO_URI, options)
    .then(() => console.log(`MongoDB Connected : ytb_audio`))
    .catch((e) => { console.log("Error while connecting to DB: \n", e)});
};

module.exports = {mongodbConnect}