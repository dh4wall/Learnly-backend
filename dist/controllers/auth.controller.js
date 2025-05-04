"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meController = exports.googleCallbackController = exports.loginController = exports.signupController = void 0;
const auth_service_1 = require("../services/auth.service");
const jwt_1 = require("../config/jwt");
const signupController = async (req, res) => {
    try {
        const { user, token } = await (0, auth_service_1.signup)(req.body);
        res.status(201).json({ user, token });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.signupController = signupController;
const loginController = async (req, res) => {
    try {
        const { user, token } = await (0, auth_service_1.login)(req.body);
        res.status(200).json({ user, token });
    }
    catch (error) {
        res.status(401).json({ message: error.message });
    }
};
exports.loginController = loginController;
const googleCallbackController = (req, res) => {
    const user = req.user; // Explicitly cast req.user to IUser
    if (!user) {
        return res.status(401).json({ message: 'Authentication failed' });
    }
    const token = (0, jwt_1.generateToken)(user); // Now TypeScript knows user is of type IUser
    const redirectPath = user.isOnboarded ? '/home' : '/onboarding';
    res.redirect(`http://localhost:3000${redirectPath}?token=${token}&isNew=${!user.isOnboarded}`);
};
exports.googleCallbackController = googleCallbackController;
const meController = async (req, res) => {
    const user = req.user; // Explicitly cast req.user to IUser
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const fetchedUser = await (0, auth_service_1.getUserById)(user.id); // Now TypeScript knows user.id exists
        res.status(200).json({ user: fetchedUser });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.meController = meController;
