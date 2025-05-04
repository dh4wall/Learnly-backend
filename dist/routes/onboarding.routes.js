"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onboarding_controller_1 = require("../controllers/onboarding.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const router = (0, express_1.Router)();
// Onboarding routes
router.post('/preferences', auth_middleware_1.authenticateJWT, validate_middleware_1.validatePreferences, onboarding_controller_1.savePreferencesController);
router.get('/preferences', auth_middleware_1.authenticateJWT, onboarding_controller_1.getPreferencesController);
exports.default = router;
