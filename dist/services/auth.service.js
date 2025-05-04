"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.login = exports.signup = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../config/jwt");
const prisma = new client_1.PrismaClient();
const signup = async (userData) => {
    const { email, password, name } = userData;
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('User already exists');
    }
    // Hash password
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // Create new user
    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            isOnboarded: false,
        },
    });
    const user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isOnboarded: newUser.isOnboarded,
        preference: null, // Adjust based on your needs
    };
    const token = (0, jwt_1.generateToken)(user);
    return { user, token };
};
exports.signup = signup;
const login = async (loginData) => {
    const { email, password } = loginData;
    // Find user
    const user = await prisma.user.findUnique({
        where: { email },
        include: { preference: true }, // Include preference if needed
    });
    if (!user || !user.password) {
        throw new Error('Invalid credentials');
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }
    const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboarded: user.isOnboarded,
        preference: user.preference || null, // Adjust based on your needs
    };
    const token = (0, jwt_1.generateToken)(userData);
    return { user: userData, token };
};
exports.login = login;
const getUserById = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id },
        include: { preference: true }, // Include preference if needed
    });
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboarded: user.isOnboarded,
        preference: user.preference || null, // Adjust based on your needs
    };
};
exports.getUserById = getUserById;
