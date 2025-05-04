import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { JwtPayload } from '../types';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.onboarding_jwt || req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const token = req.cookies.onboarding_jwt || req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    return res.json({ authenticated: true, isNew: user.isNew });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
};