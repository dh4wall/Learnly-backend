import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { JwtPayloadTeacher } from '../types/teacher';

export const teacherAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.teacher_onboarding_jwt || req.cookies.teacher_jwt;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayloadTeacher;
    const teacher = await prisma.teacher.findUnique({ where: { email: decoded.email } });
    if (!teacher) {
      return res.status(401).json({ message: 'Teacher not found' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyTeacherToken = async (req: Request, res: Response) => {
  const token = req.cookies.teacher_onboarding_jwt || req.cookies.teacher_jwt;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayloadTeacher;
    const teacher = await prisma.teacher.findUnique({ where: { email: decoded.email } });
    if (!teacher) {
      return res.status(401).json({ authenticated: false });
    }

    return res.json({ authenticated: true, isNew: teacher.isNew });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
};