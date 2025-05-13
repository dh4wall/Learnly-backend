import express from 'express';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import teacherAuthRoutes from './routes/teacherAuthRoutes';
import courseRoutes from './routes/courseRoutes';
import { teacherPassportConfig } from './controllers/teacherAuthController';
import { passportConfig } from './controllers/authController';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.VITE_FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
passportConfig();
teacherPassportConfig();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherAuthRoutes);
app.use('/api', courseRoutes);

export default app;