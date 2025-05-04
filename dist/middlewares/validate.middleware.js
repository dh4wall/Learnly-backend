"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePreferences = exports.validateLogin = exports.validateSignup = void 0;
const validateSignup = (req, res, next) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required' });
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    // Password validation (at least 6 characters)
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    next();
};
exports.validateSignup = validateSignup;
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    next();
};
exports.validateLogin = validateLogin;
const validatePreferences = (req, res, next) => {
    const { currentSkills, educationLevel, learningGoals, preferredSubjects } = req.body;
    if (!currentSkills || !educationLevel || !learningGoals || !preferredSubjects) {
        return res.status(400).json({
            message: 'currentSkills, educationLevel, learningGoals, and preferredSubjects are required'
        });
    }
    if (!Array.isArray(currentSkills) || !Array.isArray(learningGoals) || !Array.isArray(preferredSubjects)) {
        return res.status(400).json({
            message: 'currentSkills, learningGoals, and preferredSubjects must be arrays'
        });
    }
    next();
};
exports.validatePreferences = validatePreferences;
