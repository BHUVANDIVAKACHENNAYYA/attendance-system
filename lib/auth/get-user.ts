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
    // 1. Check stateless session_user cookie containing base64 JSON profile
    const sessionUserCookie = request.cookies.get('session_user')?.value;
    if (sessionUserCookie) {
      try {
        const decoded = JSON.parse(
          typeof Buffer !== 'undefined'
            ? Buffer.from(sessionUserCookie, 'base64').toString('utf-8')
            : atob(sessionUserCookie)
        );
        if (decoded && decoded.id && decoded.role) {
          const existingIdx = mockStore.profiles.findIndex((p) => p.id === decoded.id);
          if (existingIdx === -1) {
            mockStore.profiles.push(decoded);
          } else {
            mockStore.profiles[existingIdx] = { ...mockStore.profiles[existingIdx], ...decoded };
          }
          return decoded as Profile;
        }
      } catch (e) {
        console.error('Failed to decode session_user cookie:', e);
      }
    }

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
    const found = mockStore.profiles.find(
      (p) => (p.id === userId || p.email.toLowerCase() === userId.toLowerCase()) && p.active
    );
    if (found) return found;

    // Fallback: If userId starts with usr- or matches admin pattern, bind to primary admin profile
    if (userId.startsWith('usr-') || userId.includes('admin')) {
      const adminProfile = mockStore.profiles.find((p) => p.role === 'ADMIN' && p.active);
      if (adminProfile) return adminProfile;
    }

    // Fallback: If userId starts with st- or USN pattern, bind to primary student profile
    if (userId.startsWith('st-') || userId.includes('01FS24BEC')) {
      const studentProfile = mockStore.profiles.find((p) => p.role === 'STUDENT' && p.active);
      if (studentProfile) return studentProfile;
    }
  }

  return null;
}
