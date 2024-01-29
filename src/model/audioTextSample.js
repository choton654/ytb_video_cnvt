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
    segments: [
        {
            name: String,
            text: String
        }
    ]
});

audiotextsamplesSchema.index({ ytbId: true });

const audiotextsampleModel = mongoose.model('audiotextsample',
 audiotextsamplesSchema);

module.exports = audiotextsampleModel