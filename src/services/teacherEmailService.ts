import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendTeacherVerificationEmail = async (email: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/teacher/verify-email`;
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Welcome to Learnly!</h2>
      <p>Thank you for signing up as a teacher. Please verify your email address to continue.</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </p>
      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn’t sign up, please ignore this email.</p>
      <p>Best regards,<br>The Learnly Team</p>
    </div>
  `;

  await transporter.sendMail({
    to: email,
    subject: 'Verify Your Teacher Account',
    html: htmlTemplate,
  });
};