"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferencesController = exports.savePreferencesController = void 0;
const onboarding_service_1 = require("../services/onboarding.service");
const savePreferencesController = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const preferences = await (0, onboarding_service_1.savePreferences)(req.user.id, req.body);
        res.status(201).json({
            preferences,
            isOnboarded: true,
            message: 'Onboarding completed successfully'
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.savePreferencesController = savePreferencesController;
const getPreferencesController = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const preferences = await (0, onboarding_service_1.getPreferences)(req.user.id);
        res.status(200).json({ preferences });
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
};
exports.getPreferencesController = getPreferencesController;
