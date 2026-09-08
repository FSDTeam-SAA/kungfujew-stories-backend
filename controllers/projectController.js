const Project = require("../model/projectModel");

// Add Project
exports.addProject = async (req, res) => {
    try {
        const { name, figmaLink, websiteLink, adminLink, type, category, profile } = req.body;

        if (!name || !type) {
            return res.status(400).json({ success: false, message: "Name and type are required" });
        }

        // Validate type
        if (!["web", "app"].includes(type)) {
            return res.status(400).json({ success: false, message: "Type must be either 'web' or 'app'" });
        }

        const project = await Project.create({
            name,
            figmaLink,
            websiteLink,
            adminLink,
            type,
            category,
            profile,
        });

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to add project", error });
    }
};

// Get Projects with search, filtering, pagination
exports.getProjects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const categoryFilter = req.query.category || "All";
        const typeFilter = req.query.type || "All";

        const query = {};

        if (categoryFilter && categoryFilter !== "All") query.category = categoryFilter;
        if (typeFilter && typeFilter !== "All") query.type = typeFilter;

        let projects = await Project.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Project.countDocuments(query);

        if (search) {
            const words = search.trim().split(/\s+/).filter(Boolean);
            projects = projects.filter(project =>
                words.every(word =>
                    project.name.toLowerCase().includes(word.toLowerCase()) ||
                    (project.category && project.category.toLowerCase().includes(word.toLowerCase()))
                )
            );
        }

        res.status(200).json({
            success: true,
            data: projects,
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
        res.status(500).json({ success: false, message: "Failed to fetch projects", error });
    }
};

// Get single project by ID
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch project", error });
    }
};

// Update Project
exports.updateProject = async (req, res) => {
    try {
        const { name, figmaLink, websiteLink, adminLink, type, category, profile } = req.body;

        if (type && !["web", "app"].includes(type)) {
            return res.status(400).json({ success: false, message: "Type must be either 'web' or 'app'" });
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { name, figmaLink, websiteLink, adminLink, type, category, profile },
            { new: true, runValidators: true }
        );

        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update project", error });
    }
};

// Delete Project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        res.status(200).json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete project", error });
    }
};

