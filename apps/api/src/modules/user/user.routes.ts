import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticateJwt } from '../../middleware/auth.js';

export const userRouter = Router();

userRouter.use(authenticateJwt);

userRouter.post('/avatar', UserController.uploadAvatar);
userRouter.delete('/avatar', UserController.removeAvatar);
userRouter.put('/profile', UserController.updateProfile);
userRouter.post('/send-otp', UserController.sendOtp);
userRouter.post('/verify-otp', UserController.verifyOtp);
