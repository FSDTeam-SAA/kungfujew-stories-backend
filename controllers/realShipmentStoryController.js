const fs = require("fs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const RealShipmentStory = require("../model/realShipmentStoryModel");
const cloudinary = require("../config/cloudinaryConfig");

// Allowed shipment statuses
const ALLOWED_SHIPMENT_STATUSES = [
  "pending",
  "in_transit",
  "delivered",
  "cancelled",
];

// Helper to check if requester is an admin
const isRequesterAdmin = (req) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY
    );
    return decoded && decoded.role === "admin";
  } catch (error) {
    return false;
  }
};

// Helper to safely upload image to Cloudinary if available
const handleImageUpload = async (file) => {
  if (!file || !file.path) return null;

  try {
    if (
      process.env.CLOUDINARY_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "real-shipment-stories",
      });
      return result.secure_url;
    }
    return file.path;
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    throw err;
  } finally {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr) {
      console.error("Temp file cleanup failed:", cleanupErr.message);
    }
  }
};

// Helper to parse and validate FAQs
const parseAndValidateFaqs = (faqs) => {
  if (!faqs) return undefined;

  let parsed = faqs;
  if (typeof faqs === "string") {
    try {
      parsed = JSON.parse(faqs);
    } catch (err) {
      throw new Error("Invalid FAQ format. FAQs must be a valid JSON array");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("FAQs must be an array of questions and answers");
  }

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (
      !item ||
      typeof item !== "object" ||
      !item.question ||
      typeof item.question !== "string" ||
      !item.question.trim() ||
      !item.answer ||
      typeof item.answer !== "string" ||
      !item.answer.trim()
    ) {
      throw new Error(
        `FAQ item at index ${i} must have non-empty question and answer strings`
      );
    }
    parsed[i] = {
      question: item.question.trim(),
      answer: item.answer.trim(),
    };
  }

  return parsed;
};

// 1. Add Real Shipment Story (Admin only)
exports.addStory = async (req, res) => {
  try {
    let {
      title,
      slug,
      metaDescription,
      content,
      pickupLocation,
      destination,
      shipmentType,
      shipmentStatus,
      image,
      imageAlt,
      faqs,
      isPublished,
    } = req.body;

    // Handle file upload if present
    if (req.file) {
      image = await handleImageUpload(req.file);
    }

    // Required fields validation
    if (
      !title ||
      !slug ||
      !metaDescription ||
      !content ||
      !pickupLocation ||
      !destination ||
      !shipmentType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "title, slug, metaDescription, content, pickupLocation, destination, and shipmentType are required",
      });
    }

    const formattedSlug = slug.trim().toLowerCase();

    // Validate shipment status
    const status = shipmentStatus ? shipmentStatus.trim() : "pending";
    if (!ALLOWED_SHIPMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `shipmentStatus must be one of: ${ALLOWED_SHIPMENT_STATUSES.join(
          ", "
        )}`,
      });
    }

    // Check slug uniqueness
    const existingStory = await RealShipmentStory.findOne({
      slug: formattedSlug,
    });
    if (existingStory) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists. Please provide a unique slug",
      });
    }

    // Parse and validate FAQs if provided
    let parsedFaqs;
    try {
      parsedFaqs = parseAndValidateFaqs(faqs);
    } catch (faqErr) {
      return res.status(400).json({
        success: false,
        message: faqErr.message,
      });
    }

    const newStory = await RealShipmentStory.create({
      title: title.trim(),
      slug: formattedSlug,
      metaDescription: metaDescription.trim(),
      content,
      pickupLocation: pickupLocation.trim(),
      destination: destination.trim(),
      shipmentType: shipmentType.trim(),
      shipmentStatus: status,
      image: image ? image.trim() : undefined,
      imageAlt: imageAlt ? imageAlt.trim() : undefined,
      faqs: parsedFaqs,
      isPublished:
        isPublished !== undefined
          ? isPublished === true || isPublished === "true"
          : false,
    });

    res.status(201).json({
      success: true,
      data: newStory,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists. Please provide a unique slug",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to add shipment story",
    });
  }
};

// 2. Get All Stories with pagination, filtering, search
exports.getStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const shipmentStatusFilter = req.query.shipmentStatus || "All";
    const shipmentTypeFilter = req.query.shipmentType || "All";
    const isPublishedQuery = req.query.isPublished;

    const isAdmin = isRequesterAdmin(req);
    const query = {};

    // Public users can only see published stories
    if (!isAdmin) {
      query.isPublished = true;
    } else if (
      isPublishedQuery !== undefined &&
      isPublishedQuery !== "All"
    ) {
      query.isPublished =
        isPublishedQuery === "true" || isPublishedQuery === true;
    }

    // Status filter
    if (shipmentStatusFilter && shipmentStatusFilter !== "All") {
      query.shipmentStatus = shipmentStatusFilter;
    }

    // Type filter
    if (shipmentTypeFilter && shipmentTypeFilter !== "All") {
      query.shipmentType = shipmentTypeFilter;
    }

    // Search filter across title, locations, type, slug
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      query.$or = [
        { title: searchRegex },
        { pickupLocation: searchRegex },
        { destination: searchRegex },
        { shipmentType: searchRegex },
        { slug: searchRegex },
      ];
    }

    const stories = await RealShipmentStory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await RealShipmentStory.countDocuments(query);

    res.status(200).json({
      success: true,
      data: stories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shipment stories",
    });
  }
};

// 3. Get Single Story by ID or Slug
exports.getStoryByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let story = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      story = await RealShipmentStory.findById(idOrSlug);
    }

    if (!story) {
      story = await RealShipmentStory.findOne({
        slug: idOrSlug.trim().toLowerCase(),
      });
    }

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    // If story is unpublished, only admin can view it
    if (!story.isPublished && !isRequesterAdmin(req)) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shipment story",
    });
  }
};

// 4. Get Single Story specifically by Slug
exports.getStoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const story = await RealShipmentStory.findOne({
      slug: slug.trim().toLowerCase(),
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    if (!story.isPublished && !isRequesterAdmin(req)) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shipment story",
    });
  }
};

// 5. Update Story (Admin only)
exports.updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      title,
      slug,
      metaDescription,
      content,
      pickupLocation,
      destination,
      shipmentType,
      shipmentStatus,
      image,
      imageAlt,
      faqs,
      isPublished,
    } = req.body;

    const existingStory = await RealShipmentStory.findById(id);
    if (!existingStory) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    // Handle file upload
    if (req.file) {
      image = await handleImageUpload(req.file);
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription.trim();
    if (content !== undefined) updateData.content = content;
    if (pickupLocation !== undefined)
      updateData.pickupLocation = pickupLocation.trim();
    if (destination !== undefined)
      updateData.destination = destination.trim();
    if (shipmentType !== undefined)
      updateData.shipmentType = shipmentType.trim();

    // Validate shipment status if provided
    if (shipmentStatus !== undefined) {
      const status = shipmentStatus.trim();
      if (!ALLOWED_SHIPMENT_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `shipmentStatus must be one of: ${ALLOWED_SHIPMENT_STATUSES.join(
            ", "
          )}`,
        });
      }
      updateData.shipmentStatus = status;
    }

    // Validate and check slug uniqueness if changed
    if (slug !== undefined) {
      const formattedSlug = slug.trim().toLowerCase();
      if (!formattedSlug) {
        return res.status(400).json({
          success: false,
          message: "Slug cannot be empty",
        });
      }
      const duplicateSlug = await RealShipmentStory.findOne({
        slug: formattedSlug,
        _id: { $ne: id },
      });
      if (duplicateSlug) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists. Please choose a unique slug",
        });
      }
      updateData.slug = formattedSlug;
    }

    if (image !== undefined) updateData.image = image ? image.trim() : "";
    if (imageAlt !== undefined)
      updateData.imageAlt = imageAlt ? imageAlt.trim() : "";

    if (faqs !== undefined) {
      try {
        updateData.faqs = parseAndValidateFaqs(faqs);
      } catch (faqErr) {
        return res.status(400).json({
          success: false,
          message: faqErr.message,
        });
      }
    }

    if (isPublished !== undefined) {
      updateData.isPublished =
        isPublished === true || isPublished === "true";
    }

    const updatedStory = await RealShipmentStory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedStory,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Slug already exists. Please choose a unique slug",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update shipment story",
    });
  }
};

// 6. Delete Story (Admin only)
exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await RealShipmentStory.findByIdAndDelete(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipment story deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete shipment story",
    });
  }
};

// 7. Publish / Unpublish Story toggle (Admin only)
exports.publishStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await RealShipmentStory.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Shipment story not found",
      });
    }

    let isPublished;
    if (req.body.isPublished !== undefined) {
      isPublished =
        req.body.isPublished === true || req.body.isPublished === "true";
    } else {
      isPublished = !story.isPublished;
    }

    const updatedStory = await RealShipmentStory.findByIdAndUpdate(
      id,
      { isPublished },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedStory,
      message: isPublished
        ? "Story published successfully"
        : "Story unpublished successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update story publish status",
    });
  }
};

// 7. Upload Story Image (for inline content editor or general uploads)
exports.uploadStoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const imageUrl = await handleImageUpload(req.file);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: imageUrl,
    });
  } catch (error) {
    console.error("Story image upload failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};

