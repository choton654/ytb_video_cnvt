const mongoose = require('mongoose');


const audiotextsamplesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        index: true
    },
    ytbId: {
        type: String,
        required: true,
        index: true
    },
    url:String,
    title:String,
    summary:String,
    status:{
        type: Number,required: true,default:1
    },
    segments: [
        {
            name: String,
            text: String
        }
    ]
},{ timestamps: { createdAt: true, updatedAt: true } });

audiotextsamplesSchema.index({ ytbId: true });
audiotextsamplesSchema.index({ userId:1,ytbId: 1 },{unique:true});

const audiotextsampleModel = mongoose.model('audiotextsample',
 audiotextsamplesSchema);

module.exports = audiotextsampleModel