import { Router } from 'express';
import {
  signup,
  verifyEmail,
  signin,
  googleAuth,
  oauthLogin,
  saveOnboarding,
  logout,
} from '../controllers/authController';
import { authMiddleware, verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/verify-email', verifyEmail);
router.post('/signin', signin);
router.get('/google', googleAuth);
router.get('/oauth/google/callback', oauthLogin);
router.get('/google/callback', oauthLogin);
router.post('/onboarding', authMiddleware, saveOnboarding);
router.post('/logout', logout);
router.get('/verify', verifyToken);

export default router;