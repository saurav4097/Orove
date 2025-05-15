const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
    
    email: {
        type: String,
        required: true,
        
    },
    topic: {
        type: String,
        required: true,
      
    },
    shortnotes: {
        type: String,
        required: true,
       
    },
});

const Notes = mongoose.model('notes', notesSchema, 'notes');

module.exports = Notes;