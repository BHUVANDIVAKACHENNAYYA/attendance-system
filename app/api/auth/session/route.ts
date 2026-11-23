import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({
      success: true,
      user,
      isDemoMode: isUsingMockData(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, demoUserId } = body;

    // Fast demo user selection (allows testing any of the 17 students or admin with 1 click)
    if (demoUserId) {
      const found = mockStore.profiles.find((p) => p.id === demoUserId);
      if (!found) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const response = NextResponse.json({
        success: true,
        user: found,
        message: `Logged in as ${found.name}`,
      });

      // Set cookie for browser session
      response.cookies.set('demo_user_id', found.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Standard Email/Password login
    if (isUsingMockData()) {
      const found = mockStore.profiles.find(
        (p) => p.email.toLowerCase() === email?.toLowerCase()
      );

      if (!found) {
        return NextResponse.json(
          { success: false, message: 'Invalid email or user not found' },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        success: true,
        user: found,
        message: `Logged in as ${found.name}`,
      });

      response.cookies.set('demo_user_id', found.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // Supabase auth login
    const supabase = createClientServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, message: error?.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return NextResponse.json({
      success: true,
      user: profile,
      session: data.session,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Login failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.set('demo_user_id', '', {
    path: '/',
    maxAge: 0,
  });

  if (!isUsingMockData()) {
    try {
      const supabase = createClientServer();
      await supabase.auth.signOut();
    } catch {
      // Ignored
    }
  }

  return response;
}
