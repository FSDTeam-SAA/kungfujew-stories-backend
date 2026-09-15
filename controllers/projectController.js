const Project = require("../model/projectModel");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
        res.status(500).json({ success: false, message: "Failed to add project" });
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

        if (search) {
            const words = search.trim().split(/\s+/).filter(Boolean);
            if (words.length) {
                query.$and = words.map((word) => ({
                    $or: [
                        { name: { $regex: escapeRegex(word), $options: "i" } },
                        { category: { $regex: escapeRegex(word), $options: "i" } },
                    ],
                }));
            }
        }

        const projects = await Project.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Project.countDocuments(query);

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
        res.status(500).json({ success: false, message: "Failed to fetch projects" });
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
        res.status(500).json({ success: false, message: "Failed to fetch project" });
    }
};

// Update Project
exports.updateProject = async (req, res) => {
    try {
        const { name, figmaLink, websiteLink, adminLink, type, category, profile } = req.body;

        if (type && !["web", "app"].includes(type)) {
            return res.status(400).json({ success: false, message: "Type must be either 'web' or 'app'" });
        }

        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (figmaLink !== undefined) updateFields.figmaLink = figmaLink;
        if (websiteLink !== undefined) updateFields.websiteLink = websiteLink;
        if (adminLink !== undefined) updateFields.adminLink = adminLink;
        if (type !== undefined) updateFields.type = type;
        if (category !== undefined) updateFields.category = category;
        if (profile !== undefined) updateFields.profile = profile;

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update project" });
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
        res.status(500).json({ success: false, message: "Failed to delete project" });
    }
};
