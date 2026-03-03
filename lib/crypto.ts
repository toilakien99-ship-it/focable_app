const SECRET_KEY = 'focable_secure_key_2024';

function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

export function encrypt(text: string): string {
  if (!text) return '';
  return xorEncrypt(text, SECRET_KEY);
}

export function decrypt(encoded: string): string {
  if (!encoded) return '';
  return xorDecrypt(encoded, SECRET_KEY);
}
