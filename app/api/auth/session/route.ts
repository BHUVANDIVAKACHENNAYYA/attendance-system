import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { Profile } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const hasAdmin = isUsingMockData()
      ? mockStore.profiles.some((p) => p.role === 'ADMIN' && p.active)
      : true;

    return NextResponse.json({
      success: true,
      user,
      hasAdmin,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null, hasAdmin: true }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, role, usn, semester, section, photo_url } = body;

    // Real User Registration
    if (action === 'REGISTER') {
      if (!email || !password || !name) {
        return NextResponse.json(
          { success: false, message: 'Name, email, and password are required.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      if (isUsingMockData()) {
        const existing = mockStore.profiles.find(
          (p) => p.email.toLowerCase() === email.toLowerCase() || (usn && p.usn === usn)
        );

        if (existing) {
          return NextResponse.json(
            { success: false, message: 'An account with this email or USN already exists.' },
            { status: 409 }
          );
        }

        // If no admin exists in the system yet, this first user becomes ADMIN
        const hasExistingAdmin = mockStore.profiles.some((p) => p.role === 'ADMIN');
        const assignedRole = !hasExistingAdmin ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'STUDENT');

        const newProfile: Profile = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: assignedRole,
          usn: assignedRole === 'STUDENT' ? usn?.trim() || null : null,
          semester: semester ? String(semester).trim() : null,
          section: section ? String(section).trim() : null,
          photo_url: photo_url || null,
          password: password, // In production Supabase Auth manages hashing; for standalone JSON this stores user credential
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        mockStore.profiles.push(newProfile);
        saveStore();

        const response = NextResponse.json({
          success: true,
          user: newProfile,
          message: `Account created successfully as ${assignedRole}.`,
        });

        response.cookies.set('demo_user_id', newProfile.id, {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      }

      // Supabase Auth Registration
      const supabase = createClientServer();
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: role || 'STUDENT',
            usn,
            semester,
            section,
            photo_url,
          },
        },
      });

      if (authErr || !authData.user) {
        return NextResponse.json(
          { success: false, message: authErr?.message || 'Registration failed' },
          { status: 400 }
        );
      }

      const service = getServiceRoleClient() || supabase;
      const { data: profile } = await service
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      return NextResponse.json({
        success: true,
        user: profile,
        message: 'Account registered successfully.',
      });
    }

    // Standard Real Email/Password Login
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide email and password.' },
        { status: 400 }
      );
    }

    if (isUsingMockData()) {
      const found = mockStore.profiles.find(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      );

      if (!found) {
        return NextResponse.json(
          { success: false, message: 'No registered account found with this email.' },
          { status: 401 }
        );
      }

      if (!found.active) {
        return NextResponse.json(
          { success: false, message: 'Account is deactivated. Contact college administrator.' },
          { status: 403 }
        );
      }

      if (found.password && found.password !== password) {
        return NextResponse.json(
          { success: false, message: 'Invalid password. Please try again.' },
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
      { success: false, message: error?.message || 'Authentication error' },
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
