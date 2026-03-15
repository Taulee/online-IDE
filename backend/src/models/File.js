const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    enum: ['python', 'cpp', 'nodejs'],
    required: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('File', fileSchema);
