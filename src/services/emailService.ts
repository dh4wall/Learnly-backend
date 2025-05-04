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

export const sendVerificationEmail = async (email: string) => {
  const url = `${process.env.FRONTEND_URL}/verify-email`;
  await transporter.sendMail({
    to: email,
    subject: 'Verify Your Email',
    html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
  });
};