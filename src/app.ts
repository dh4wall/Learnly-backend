import express from 'express';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import { passportConfig } from './controllers/authController';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
passportConfig();

app.use('/api/auth', authRoutes);

export default app;