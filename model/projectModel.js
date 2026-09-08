const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    figmaLink: { type: String },
    websiteLink: { type: String },
    adminLink: { type: String },
    type:{
      type: String,
      enum: ["web", "app"],
      required: true
    },
    category: {
      type: String,
    },
    profile: {
      type: String,
    },
    
  },
  { timestamps: true }
);

const ProjectModel = mongoose.model("Project", ProjectSchema);
module.exports = ProjectModel;