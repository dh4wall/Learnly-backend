"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileController = exports.getProfileController = void 0;
const user_service_1 = require("../services/user.service");
const getProfileController = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const profile = await (0, user_service_1.getProfile)(req.user.id);
        res.status(200).json({ profile });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProfileController = getProfileController;
const updateProfileController = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await (0, user_service_1.updateProfile)(req.user.id, req.body);
        res.status(200).json({ user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateProfileController = updateProfileController;
