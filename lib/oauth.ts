import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

function getRedirectUri(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return Linking.createURL('/auth/callback');
}

async function oauthNative(provider: 'google' | 'facebook'): Promise<{ error: string | null }> {
  const redirectUri = getRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: 'Không thể tạo URL đăng nhập' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type !== 'success') {
    return { error: result.type === 'cancel' ? 'Đăng nhập bị hủy' : 'Đăng nhập thất bại' };
  }

  const parsedUrl = new URL(result.url);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace('#', ''));
  const queryParams = new URLSearchParams(parsedUrl.search);

  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return { error: 'Không nhận được thông tin xác thực từ nhà cung cấp' };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) return { error: sessionError.message };
  return { error: null };
}

async function oauthWeb(provider: 'google' | 'facebook'): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getRedirectUri(),
      skipBrowserRedirect: false,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  return Platform.OS === 'web' ? oauthWeb('google') : oauthNative('google');
}

export async function signInWithFacebook(): Promise<{ error: string | null }> {
  return Platform.OS === 'web' ? oauthWeb('facebook') : oauthNative('facebook');
}
