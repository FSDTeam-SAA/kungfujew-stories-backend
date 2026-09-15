require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/dbConfig");
const RealShipmentStory = require("../model/realShipmentStoryModel");

async function run() {
  await connectDB();
  const stories = await RealShipmentStory.find({
    $or: [{ serviceLine: { $exists: false } }, { serviceLine: "" }],
  })
    .select("title slug shipmentType isPublished")
    .sort({ createdAt: -1 })
    .lean();

  console.table(
    stories.map((story) => ({
      id: String(story._id),
      title: story.title,
      slug: story.slug,
      shipmentType: story.shipmentType,
      published: story.isPublished,
    }))
  );
  console.log(`${stories.length} story or stories require a reviewed service line.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Service-line audit failed:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
