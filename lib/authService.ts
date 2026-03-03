import { supabase } from './supabase';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Vui lòng nhập email';
  if (!EMAIL_REGEX.test(email.trim())) return 'Email không hợp lệ';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu';
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
}

export async function registerWithEmail(email: string, password: string, fullName: string) {
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      return { error: 'Email này đã được đăng ký' };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function resendOtp(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'signup',
  });
  if (error) return { error: 'Mã OTP không đúng hoặc đã hết hạn' };
  return { error: null };
}

export async function createNotification(userId: string, type: string, title: string, body: string, data: object = {}) {
  await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
}
