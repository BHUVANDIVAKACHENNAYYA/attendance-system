import { NextRequest } from 'next/server';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { isUsingMockData, mockStore } from '@/lib/supabase/mock-store';
import { Profile } from '@/types';

/**
 * Extracts and verifies the authenticated user from the request.
 * Supports both real Supabase Auth cookies/JWTs and local demo session cookies.
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<Profile | null> {
  // If real Supabase is configured
  if (!isUsingMockData()) {
    try {
      const supabase = createClientServer();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Fetch user profile
      const serviceClient = getServiceRoleClient() || supabase;
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && profile.active) {
        return profile as Profile;
      }
      return null;
    } catch (err) {
      console.error('Supabase auth resolution failed, falling back to session header/cookie:', err);
    }
  }

  // Local/Demo Auth Resolution via cookie or Authorization header
  let userId: string | null = null;

  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.replace('Bearer ', '').trim();
    }

    if (!userId) {
      const cookie = request.cookies.get('demo_user_id');
      if (cookie?.value) {
        userId = cookie.value;
      }
    }
  }

  if (userId) {
    const found = mockStore.profiles.find((p) => p.id === userId && p.active);
    if (found) return found;
  }

  return null;
}
