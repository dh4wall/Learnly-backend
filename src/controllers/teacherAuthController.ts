// server/src/controllers/teacherAuthController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy } from 'passport-jwt';
import prisma from '../utils/db';
import { sendTeacherVerificationEmail } from '../services/teacherEmailService';
import { JwtPayloadTeacher } from '../types/teacher';
import { Teacher } from '@prisma/client';
import { courseCache, divisionCache, contentCache } from '../routes/courseRoutes';

const fetchTeacherData = async (teacherId: number) => {
  try {
    console.log(`Fetching data for teacher ${teacherId}...`);

    const courses = await prisma.course.findMany({
      where: { teacherId },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        price: true,
      },
    });
    courseCache.set(teacherId, courses.map(course => ({
      id: course.id,
      name: course.name,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price || 0,
    })));
    console.log(`Cached ${courses.length} courses for teacher ${teacherId}:`, courses);

    for (const course of courses) {
      const divisions = await prisma.division.findMany({
        where: { courseId: course.id },
        select: {
          id: true,
          title: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      });
      divisionCache.set(course.id, divisions);
      console.log(`Cached ${divisions.length} divisions for course ${course.id}`);
    }

    const divisionIds = Array.from(divisionCache.keys()).flatMap(courseId =>
      (divisionCache.get(courseId) || []).map(div => div.id)
    );
    for (const divisionId of divisionIds) {
      const contents = await prisma.content.findMany({
        where: { divisionId },
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
          fileUrl: true,
          duration: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      contentCache.set(divisionId, contents);
      console.log(`Cached ${contents.length} contents for division ${divisionId}`);
    }
  } catch (error) {
    console.error(`Error fetching teacher data for teacher ${teacherId}:`, error);
  }
};

export const teacherPassportConfig = () => {
  passport.use(
    'teacher-google',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_TEACHER_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google OAuth Teacher Profile:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
          });

          let teacher = await prisma.teacher.findFirst({
            where: { provider: 'google', providerId: profile.id },
          });

          if (!teacher) {
            teacher = await prisma.teacher.create({
              data: {
                email: profile.emails![0].value,
                provider: 'google',
                providerId: profile.id,
                isEmailVerified: true,
                isNew: true,
                name: profile.displayName || 'Teacher',
              },
            });
            console.log('Created new teacher:', teacher);
          } else {
            console.log('Found existing teacher:', teacher);
          }

          return done(null, teacher);
        } catch (error) {
          console.error('Teacher GoogleStrategy error:', error);
          return done(error);
        }
      }
    )
  );

  const jwtSecret = process.env.JWT_SECRET as string;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const cookieExtractor = (req: Request) => {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies['teacher_jwt'] || req.cookies['teacher_onboarding_jwt'];
      console.log('Extracted token:', token ? 'Present' : 'Missing', 'Cookies:', req.cookies);
    }
    return token;
  };

  passport.use(
    'teacher-jwt',
    new JwtStrategy(
      {
        jwtFromRequest: cookieExtractor,
        secretOrKey: jwtSecret,
      },
      async (payload: JwtPayloadTeacher, done: (error: any, user?: any) => void) => {
        try {
          console.log('JWT payload:', payload);
          const teacher = await prisma.teacher.findUnique({
            where: { email: payload.email },
          });
          if (teacher) {
            console.log('Teacher found:', teacher.email);
            return done(null, teacher);
          }
          console.log('Teacher not found for email:', payload.email);
          return done(null, false);
        } catch (error) {
          console.error('Teacher JWT strategy error:', error);
          return done(error, false);
        }
      }
    )
  );
};

const generateToken = (teacher: Teacher): string => {
  const payload: JwtPayloadTeacher = {
    email: teacher.email,
    provider: teacher.provider,
    providerId: teacher.providerId,
    isNew: teacher.isNew,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

const generateVerificationToken = (email: string): string => {
  const payload = { email, type: 'email_verification' };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  try {
    const existingTeacher = await prisma.teacher.findUnique({ where: { email } });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken(email);

    await prisma.teacher.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'email',
        providerId: email,
        isNew: true,
        isEmailVerified: false,
      },
    });

    res.cookie('teacher_email_verification_jwt', verificationToken, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    await sendTeacherVerificationEmail(email);

    res.status(201).json({ message: 'Teacher created, please verify your email' });
  } catch (error) {
    console.error('Teacher signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const cookieToken = req.cookies.teacher_email_verification_jwt;

  if (!cookieToken) {
    return res.status(400).json({ message: 'No verification token provided' });
  }

  try {
    const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET!) as { email: string; type: string };
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { email: decoded.email } });
    if (!teacher) {
      return res.status(400).json({ message: 'Teacher not found' });
    }

    if (teacher.isEmailVerified) {
      const authToken = generateToken(teacher);
      res.cookie('teacher_onboarding_jwt', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      return res.json({ message: 'Email already verified', redirect: '/teacher/onboarding' });
    }

    await prisma.teacher.update({
      where: { email: teacher.email },
      data: { isEmailVerified: true },
    });

    res.clearCookie('teacher_email_verification_jwt');
    const authToken = generateToken(teacher);
    res.cookie('teacher_onboarding_jwt', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Email verified', redirect: '/teacher/onboarding' });
  } catch (error) {
    console.error('Teacher verifyEmail error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      return res.status(401).json({ message: 'No such teacher present' });
    }

    if (!teacher.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password!);
    if (!isMatch) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    const token = generateToken(teacher);
    res.cookie('teacher_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Successful signin', redirect: '/teacher/dashboard' });
  } catch (error) {
    console.error('Teacher signin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleAuth = passport.authenticate('teacher-google', { scope: ['profile', 'email'] });

export const oauthLogin = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('teacher-google', { session: false }, (err: any, teacher: Teacher) => {
    if (err) {
      console.error('Teacher OAuth authentication error:', err);
      return res.status(500).json({ message: 'OAuth authentication failed', error: err.message });
    }
    if (!teacher) {
      console.error('No teacher returned from Google authentication');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const token = generateToken(teacher);
    res.cookie(teacher.isNew ? 'teacher_onboarding_jwt' : 'teacher_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const redirectUrl = teacher.isNew 
      ? `${process.env.FRONTEND_URL}/teacher/onboarding` 
      : `${process.env.FRONTEND_URL}/teacher/dashboard`;
    console.log('Teacher OAuth success, redirecting:', {
      email: teacher.email,
      isNew: teacher.isNew,
      redirect: redirectUrl,
    });

    res.redirect(redirectUrl);
  })(req, res, next);
};

export const saveOnboarding = async (req: Request, res: Response) => {
  const { username, teachingExperience, fieldOfStudy } = req.body;
  const user = req.user as Teacher;

  try {
    const teacher = await prisma.teacher.findUnique({ where: { email: user.email } });
    if (!teacher) {
      return res.status(400).json({ message: 'Teacher not found' });
    }

    await prisma.teacher.update({
      where: { email: user.email },
      data: {
        username,
        teachingExperience,
        fieldOfStudy,
        isNew: false,
      },
    });

    const updatedTeacher = await prisma.teacher.findUnique({ where: { email: user.email } });
    if (!updatedTeacher) {
      throw new Error('Teacher not found');
    }

    const token = generateToken(updatedTeacher);
    res.clearCookie('teacher_onboarding_jwt');
    res.cookie('teacher_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Teacher onboarding completed', redirect: '/teacher/dashboard' });
  } catch (error) {
    console.error('Teacher onboarding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('teacher_jwt');
  res.clearCookie('teacher_onboarding_jwt');
  res.clearCookie('teacher_email_verification_jwt');
  res.json({ message: 'Logged out' });
};

export const verify = async (req: Request, res: Response) => {
  const token = req.cookies.teacher_jwt || req.cookies.teacher_onboarding_jwt;
  console.log('Verify endpoint: Received token from cookies:', token ? 'Present' : 'Missing');
  if (!token) {
    console.log('Verify endpoint: No token provided');
    return res.status(401).json({ authenticated: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayloadTeacher;
    console.log('Verify endpoint: Token decoded:', decoded);
    const teacher = await prisma.teacher.findUnique({ where: { email: decoded.email } });
    if (!teacher) {
      console.log('Verify endpoint: Teacher not found for email:', decoded.email);
      return res.status(401).json({ authenticated: false, message: 'Teacher not found' });
    }
    console.log('Verify endpoint: Teacher verified:', teacher.email);
    await fetchTeacherData(teacher.id); // Ensure cache is populated
    res.json({ authenticated: true, isNew: teacher.isNew, teacher });
  } catch (error) {
    console.error('Verify endpoint error:', error);
    res.status(401).json({ authenticated: false, message: 'Invalid or expired token' });
  }
};