const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    firstName:{type:String,required: true},
    lastName:String,
    password:String,
    signUptype:{
        type: String,required: true,
        enum: ['manual', 'social'],
        default: 'manual',
    }
});


const userModel = mongoose.model('user',
 userSchema);

module.exports = userModel