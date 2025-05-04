"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            preferences: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboarded: user.isOnboarded,
        preferences: user.preferences,
    };
};
exports.getProfile = getProfile;
const updateProfile = async (userId, data) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...data,
        },
    });
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboarded: user.isOnboarded,
    };
};
exports.updateProfile = updateProfile;
