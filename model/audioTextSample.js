const mongoose = require('mongoose');


const audiotextsamplesSchema = new mongoose.Schema({
    ytbId: {
        type: String,
        required: true,
        index: true
    },
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