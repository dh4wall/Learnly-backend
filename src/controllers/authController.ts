import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../utils/db';
import { sendVerificationEmail } from '../services/emailService';
import { JwtPayload } from '../types';
import { User } from '@prisma/client';

export const passportConfig = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google OAuth Profile:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
          });

          let user = await prisma.user.findFirst({
            where: { provider: 'google', providerId: profile.id },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: profile.emails![0].value,
                provider: 'google',
                providerId: profile.id,
                isEmailVerified: true,
                isNew: true,
              },
            });
            console.log('Created new user:', user);
          } else {
            console.log('Found existing user:', user);
          }

          return done(null, user);
        } catch (error) {
          console.error('GoogleStrategy error:', error);
          return done(error);
        }
      }
    )
  );
};

const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    email: user.email,
    provider: user.provider,
    providerId: user.providerId,
    isNew: user.isNew,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

const generateVerificationToken = (email: string): string => {
  const payload = { email, type: 'email_verification' };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken(email);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isNew: true,
        isEmailVerified: false,
      },
    });

    res.cookie('email_verification_jwt', verificationToken, { 
      httpOnly: true, 
      maxAge: 15 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    await sendVerificationEmail(email);

    res.status(201).json({ message: 'User created, please verify your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const cookieToken = req.cookies.email_verification_jwt;

  if (!cookieToken) {
    return res.status(400).json({ message: 'No verification token provided' });
  }

  try {
    const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET!) as { email: string; type: string };
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    await prisma.user.update({
      where: { email: user.email },
      data: { isEmailVerified: true },
    });

    res.clearCookie('email_verification_jwt');
    const authToken = generateToken(user);
    res.cookie('onboarding_jwt', authToken, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Email verified', redirect: '/onboarding' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'No such user present' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email' });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    const token = generateToken(user);
    res.cookie('jwt', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Successful signin', redirect: '/home' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const oauthLogin = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, (err: any, user: User) => {
    if (err) {
      console.error('OAuth authentication error:', err);
      return res.status(500).json({ message: 'OAuth authentication failed', error: err.message });
    }
    if (!user) {
      console.error('No user returned from Google authentication');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const token = generateToken(user);
    res.cookie(user.isNew ? 'onboarding_jwt' : 'jwt', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const redirectUrl = user.isNew 
      ? `${process.env.FRONTEND_URL}/onboarding` 
      : `${process.env.FRONTEND_URL}/home`;

    console.log('OAuth success, redirecting user:', {
      email: user.email,
      isNew: user.isNew,
      redirect: redirectUrl,
    });

    res.redirect(redirectUrl);
  })(req, res, next);
};


export const saveOnboarding = async (req: Request, res: Response) => {
  const { education_level, username, interests } = req.body;
  const user = req.user as JwtPayload;

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) throw new Error('User not found');

    await prisma.onboarding.create({
      data: {
        userId: dbUser.id,
        educationLevel: education_level,
        username,
        interests,
      },
    });

    await prisma.user.update({
      where: { email: user.email },
      data: { isNew: false },
    });

    const updatedUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!updatedUser) throw new Error('User not found');
    const token = generateToken(updatedUser);
    res.clearCookie('onboarding_jwt');
    res.cookie('jwt', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Onboarding completed', redirect: '/home' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt');
  res.clearCookie('onboarding_jwt');
  res.clearCookie('email_verification_jwt');
  res.json({ message: 'Logged out' });
};