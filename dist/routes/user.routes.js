"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protected routes
router.get('/profile', auth_middleware_1.authenticateJWT, auth_middleware_1.checkOnboarded, user_controller_1.getProfileController);
router.put('/profile', auth_middleware_1.authenticateJWT, auth_middleware_1.checkOnboarded, user_controller_1.updateProfileController);
exports.default = router;
