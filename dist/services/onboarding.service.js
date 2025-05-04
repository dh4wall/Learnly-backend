"use strict";
// import { PrismaClient } from '@prisma/client';
// import { IPreferencesInput } from '../types/user.types';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = exports.savePreferences = void 0;
// const prisma = new PrismaClient();
// export const savePreferences = async (userId: string, preferencesData: IPreferencesInput): Promise<any> => {
//   // Check if the user exists
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: {
//       preference: true,
//     },
//   });
//   if (!user) {
//     throw new Error('User not found');
//   }
//   // Create or update preferences
//   if (user.preference) {
//     // Update existing preferences
//     const updatedPreferences = await prisma.userPreference.update({
//       where: { userId },
//       data: {
//         ...preferencesData,
//       },
//     });
//     // Mark user as onboarded
//     await prisma.user.update({
//       where: { id: userId },
//       data: {
//         isOnboarded: true,
//       },
//     });
//     return updatedPreferences;
//   } else {
//     // Create new preferences
//     const newPreferences = await prisma.userPreference.create({
//       data: {
//         ...preferencesData,
//         userId,
//       },
//     });
//     // Mark user as onboarded
//     await prisma.user.update({
//       where: { id: userId },
//       data: {
//         isOnboarded: true,
//       },
//     });
//     return newPreferences;
//   }
// };
// export const getPreferences = async (userId: string): Promise<any> => {
//   const preferences = await prisma.userPreference.findUnique({
//     where: { userId },
//   });
//   if (!preferences) {
//     throw new Error('Preferences not found');
//   }
//   return preferences;
// };
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const savePreferences = async (userId, preferencesData) => {
    // Check if the user exists
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            preference: true, // Corrected here
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    // Create or update preferences
    if (user.preference) {
        // Update existing preferences
        const updatedPreferences = await prisma.userPreference.update({
            where: { userId },
            data: {
                ...preferencesData,
            },
        });
        // Mark user as onboarded
        await prisma.user.update({
            where: { id: userId },
            data: {
                isOnboarded: true,
            },
        });
        return updatedPreferences;
    }
    else {
        // Create new preferences
        const newPreferences = await prisma.userPreference.create({
            data: {
                ...preferencesData,
                userId,
            },
        });
        // Mark user as onboarded
        await prisma.user.update({
            where: { id: userId },
            data: {
                isOnboarded: true,
            },
        });
        return newPreferences;
    }
};
exports.savePreferences = savePreferences;
const getPreferences = async (userId) => {
    const preferences = await prisma.userPreference.findUnique({
        where: { userId },
    });
    if (!preferences) {
        throw new Error('Preferences not found');
    }
    return preferences;
};
exports.getPreferences = getPreferences;
