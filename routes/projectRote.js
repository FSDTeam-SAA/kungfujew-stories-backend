const express = require("express");
const projectRouter = express.Router();
const { protected } = require("../middlewares/authMiddilewares");
const {
  addProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");


projectRouter.post("/", protected, addProject);

projectRouter.get("/", getProjects);

projectRouter.get("/:id", getProjectById);

projectRouter.put("/:id", protected, updateProject);

projectRouter.delete("/:id", protected, deleteProject);

module.exports = projectRouter;
