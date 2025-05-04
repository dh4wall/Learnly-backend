"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
// JWT Strategy
passport_1.default.use(new passport_jwt_1.Strategy({
    jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
}, async (jwtPayload, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: jwtPayload.id },
        });
        if (!user) {
            return done(null, false);
        }
        const passportUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            isOnboarded: user.isOnboarded,
            preference: null, // Adjust based on your actual data; fetch preference if needed
        };
        return done(null, passportUser);
    }
    catch (error) {
        return done(error, false);
    }
}));
// Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:8000/api/auth/google/callback',
    scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error('Email not found in Google profile'), false);
        }
        let user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: profile.displayName || email,
                    googleId: profile.id,
                    isOnboarded: false,
                },
            });
        }
        else if (!user.googleId) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
            });
        }
        const passportUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            isOnboarded: user.isOnboarded,
            preference: null, // Adjust if you need to fetch preferences
        };
        return done(null, passportUser);
    }
    catch (error) {
        return done(error, false);
    }
}));
exports.default = passport_1.default;
