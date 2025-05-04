"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOnboarded = exports.authenticateJWT = void 0;
const passport_1 = __importDefault(require("passport"));
const authenticateJWT = (req, res, next) => {
    passport_1.default.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        next();
    })(req, res, next);
};
exports.authenticateJWT = authenticateJWT;
const checkOnboarded = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!req.user.isOnboarded) {
        return res.status(403).json({
            message: 'User not onboarded',
            status: 'ONBOARDING_REQUIRED',
            userId: req.user.id
        });
    }
    next();
};
exports.checkOnboarded = checkOnboarded;
