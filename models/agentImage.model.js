const mongoose = require('mongoose');

const agentImageSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    type: { type: String, enum: ['avatar', 'poster'], required: true },
    url: { type: String, required: true },
    publicId: { type: String }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgentImage', agentImageSchema);
