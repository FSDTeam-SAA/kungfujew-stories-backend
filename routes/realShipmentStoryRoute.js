const express = require("express");
const realShipmentStoryRouter = express.Router();
const { protected } = require("../middlewares/authMiddilewares");
const upload = require("../uploder/imageUploder");
const {
  addStory,
  getStories,
  getStoryByIdOrSlug,
  getStoryBySlug,
  updateStory,
  deleteStory,
  publishStory,
  uploadStoryImage,
} = require("../controllers/realShipmentStoryController");

// Upload route for editor inline images
realShipmentStoryRouter.post(
  "/upload-image",
  protected,
  upload.single("image"),
  uploadStoryImage
);

// Public & Admin routes
realShipmentStoryRouter.get("/", getStories);
realShipmentStoryRouter.get("/slug/:slug", getStoryBySlug);
realShipmentStoryRouter.get("/:idOrSlug", getStoryByIdOrSlug);

// Admin-only protected routes
realShipmentStoryRouter.post("/", protected, upload.single("image"), addStory);
realShipmentStoryRouter.put("/:id", protected, upload.single("image"), updateStory);
realShipmentStoryRouter.patch("/:id/publish", protected, publishStory);
realShipmentStoryRouter.delete("/:id", protected, deleteStory);

module.exports = realShipmentStoryRouter;


