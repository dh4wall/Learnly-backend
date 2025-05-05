import { Router } from 'express';
import {
  signup,
  verifyEmail,
  signin,
  googleAuth,
  oauthLogin,
  saveOnboarding,
  logout,
} from '../controllers/teacherAuthController';
import { verifyTeacherToken } from '../middleware/teacherAuthMiddleware';
import { teacherAuthMiddleware } from '../middleware/teacherAuthMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/verify-email', verifyEmail);
router.post('/signin', signin);
router.get('/google', googleAuth);
router.get('/google/callback', oauthLogin);
router.post('/onboarding', teacherAuthMiddleware, saveOnboarding);
router.post('/logout', logout);
router.get('/verify', verifyTeacherToken);

export default router;