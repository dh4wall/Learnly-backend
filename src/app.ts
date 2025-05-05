import express from 'express';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import teacherAuthRoutes from './routes/teacherAuthRoutes';
import { teacherPassportConfig } from './controllers/teacherAuthController';
import { passportConfig } from './controllers/authController';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
passportConfig();
teacherPassportConfig();

app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherAuthRoutes);

export default app;