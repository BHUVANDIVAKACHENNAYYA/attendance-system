export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { locationSchema } from '@/lib/validation';
import { isUsingMockData, mockStore, saveStore } from '@/lib/supabase/mock-store';
import { createClientServer } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { AttendanceLocation } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (isUsingMockData()) {
      return NextResponse.json({ success: true, locations: mockStore.locations });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    const { data, error } = await supabase
      .from('attendance_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, locations: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const locationId = body.id;

    const validated = locationSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid location details',
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, latitude, longitude, radius_meters, max_accuracy_meters, active } = validated.data;
    const now = new Date().toISOString();

    if (isUsingMockData()) {
      if (locationId) {
        const index = mockStore.locations.findIndex((l) => l.id === locationId);
        if (index === -1) {
          return NextResponse.json({ success: false, message: 'Location not found' }, { status: 404 });
        }
        mockStore.locations[index] = {
          ...mockStore.locations[index],
          name,
          latitude,
          longitude,
          radius_meters,
          max_accuracy_meters,
          active,
          updated_at: now,
        };

        mockStore.auditLogs.unshift({
          id: `log-${Date.now()}`,
          user_id: user.id,
          action: 'LOCATION_UPDATED',
          entity_type: 'attendance_location',
          entity_id: locationId,
          metadata: { name, latitude, longitude, radius_meters },
          created_at: now,
        });

        saveStore();

        return NextResponse.json({
          success: true,
          message: 'Location updated successfully',
          location: mockStore.locations[index],
        });
      }

      const newLocation: AttendanceLocation = {
        id: `loc-${Date.now()}`,
        name,
        latitude,
        longitude,
        radius_meters,
        max_accuracy_meters,
        active,
        created_at: now,
        updated_at: now,
      };

      mockStore.locations.push(newLocation);
      mockStore.auditLogs.unshift({
        id: `log-${Date.now()}`,
        user_id: user.id,
        action: 'LOCATION_CREATED',
        entity_type: 'attendance_location',
        entity_id: newLocation.id,
        metadata: { name, latitude, longitude, radius_meters },
        created_at: now,
      });

      saveStore();

      return NextResponse.json({
        success: true,
        message: 'Location created successfully',
        location: newLocation,
      });
    }

    const supabase = getServiceRoleClient() || createClientServer();
    if (locationId) {
      const { data, error } = await supabase
        .from('attendance_locations')
        .update({
          name,
          latitude,
          longitude,
          radius_meters,
          max_accuracy_meters,
          active,
          updated_at: now,
        })
        .eq('id', locationId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'LOCATION_UPDATED',
        entity_type: 'attendance_location',
        entity_id: locationId,
        metadata: { name, latitude, longitude, radius_meters },
      });

      return NextResponse.json({
        success: true,
        message: 'Location updated successfully',
        location: data,
      });
    }

    const { data, error } = await supabase
      .from('attendance_locations')
      .insert({
        name,
        latitude,
        longitude,
        radius_meters,
        max_accuracy_meters,
        active,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'LOCATION_CREATED',
      entity_type: 'attendance_location',
      entity_id: data.id,
      metadata: { name, latitude, longitude, radius_meters },
    });

    return NextResponse.json({
      success: true,
      message: 'Location created successfully',
      location: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Location operation failed' },
      { status: 500 }
    );
  }
}
