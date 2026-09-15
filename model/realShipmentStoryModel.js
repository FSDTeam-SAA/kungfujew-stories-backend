const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "FAQ question is required"],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, "FAQ answer is required"],
      trim: true,
    },
  },
  { _id: false }
);

const realShipmentStorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    metaDescription: {
      type: String,
      required: [true, "Meta description is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    pickupLocation: {
      type: String,
      required: [true, "Pickup location is required"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    shipmentType: {
      type: String,
      required: [true, "Shipment type is required"],
      trim: true,
    },
    serviceLine: {
      type: String,
      enum: {
        values: ["vehicle", "freight", "heavy-equipment"],
        message: "Service line must be vehicle, freight, or heavy-equipment",
      },
      required: [true, "Service line is required"],
      trim: true,
    },
    shipmentStatus: {
      type: String,
      enum: {
        values: ["pending", "in_transit", "delivered", "cancelled"],
        message: "Shipment status must be pending, in_transit, delivered, or cancelled",
      },
      default: "pending",
      required: [true, "Shipment status is required"],
    },
    image: {
      type: String,
      trim: true,
    },
    imageAlt: {
      type: String,
      trim: true,
    },
    faqs: [faqSchema],
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const RealShipmentStoryModel = mongoose.model(
  "RealShipmentStory",
  realShipmentStorySchema
);

module.exports = RealShipmentStoryModel;
