import { supabase } from './supabase';

export async function generatePairingCode(childId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from('pairing_codes').insert({
    code,
    child_id: childId,
    expires_at: expiresAt,
    is_used: false,
  });

  return code;
}

export async function linkParentToChild(parentId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const { data: pairing } = await supabase
    .from('pairing_codes')
    .select('*')
    .eq('code', code)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!pairing) return { success: false, error: 'Mã không hợp lệ hoặc đã hết hạn' };
  if (pairing.child_id === parentId) return { success: false, error: 'Không thể tự liên kết với chính mình' };

  const { error } = await supabase.from('parent_child_links').upsert({
    parent_id: parentId,
    child_id: pairing.child_id,
    status: 'active',
    linked_at: new Date().toISOString(),
  }, { onConflict: 'parent_id,child_id' });

  if (error) return { success: false, error: error.message };

  await supabase.from('pairing_codes').update({ is_used: true }).eq('id', pairing.id);

  await supabase.from('notifications').insert({
    user_id: pairing.child_id,
    type: 'info',
    title: 'Đã liên kết tài khoản',
    body: 'Một tài khoản phụ huynh đã được liên kết với tài khoản của bạn.',
    data: { parent_id: parentId },
  });

  return { success: true };
}

export async function getLinkedChildren(parentId: string) {
  const { data } = await supabase
    .from('parent_child_links')
    .select('*, child:child_id(id, full_name, avatar_url)')
    .eq('parent_id', parentId)
    .eq('status', 'active');
  return data ?? [];
}

export async function getLinkedParents(childId: string) {
  const { data } = await supabase
    .from('parent_child_links')
    .select('*, parent:parent_id(id, full_name, avatar_url)')
    .eq('child_id', childId)
    .eq('status', 'active');
  return data ?? [];
}

export async function revokeLink(linkId: string, requesterId: string): Promise<{ success: boolean; error?: string }> {
  const { data: link } = await supabase
    .from('parent_child_links')
    .select('*')
    .eq('id', linkId)
    .maybeSingle();

  if (!link) return { success: false, error: 'Liên kết không tồn tại' };
  if (link.parent_id !== requesterId && link.child_id !== requesterId) {
    return { success: false, error: 'Không có quyền hủy liên kết này' };
  }

  await supabase.from('parent_child_links').update({ status: 'revoked' }).eq('id', linkId);
  return { success: true };
}

export async function getChildLocationHistory(childId: string, limit = 20) {
  const { data } = await supabase
    .from('location_history')
    .select('*')
    .eq('user_id', childId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getChildBypassAttempts(childId: string) {
  const { data } = await supabase
    .from('bypass_attempts')
    .select('*')
    .eq('user_id', childId)
    .order('occurred_at', { ascending: false })
    .limit(30);
  return data ?? [];
}

export async function logBypassAttempt(userId: string, attemptType: string, detail: string) {
  await supabase.from('bypass_attempts').insert({
    user_id: userId,
    attempt_type: attemptType,
    detail,
    device_info: {},
    occurred_at: new Date().toISOString(),
  });
}
