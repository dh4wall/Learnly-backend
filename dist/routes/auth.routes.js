"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Email/Password Authentication
router.post('/signup', validate_middleware_1.validateSignup, auth_controller_1.signupController);
router.post('/login', validate_middleware_1.validateLogin, auth_controller_1.loginController);
// Google OAuth
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport_1.default.authenticate('google', { session: false }), auth_controller_1.googleCallbackController);
// Get current user
router.get('/me', auth_middleware_1.authenticateJWT, auth_controller_1.meController);
exports.default = router;
