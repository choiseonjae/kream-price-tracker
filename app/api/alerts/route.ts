import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/auth-server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId, direction, thresholdPercent, isActive } = body;

    if (!itemId || !direction || thresholdPercent === undefined) {
      return NextResponse.json(
        { error: 'itemId, direction, and thresholdPercent are required' },
        { status: 400 }
      );
    }

    if (!['KR_MORE_EXPENSIVE', 'JP_MORE_EXPENSIVE'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction must be KR_MORE_EXPENSIVE or JP_MORE_EXPENSIVE' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if alert already exists for this item
    const { data: existingAlert } = await (supabase
      .from('price_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single() as any);

    if (existingAlert) {
      // Update existing alert
      const { error } = await (supabase
        .from('price_alerts')
        .update as any)({
          direction,
          threshold_percent: thresholdPercent,
          is_active: isActive !== undefined ? isActive : true,
        })
        .eq('id', existingAlert.id);

      if (error) throw error;
    } else {
      // Create new alert
      const { error } = await (supabase
        .from('price_alerts')
        .insert as any)({
          user_id: user.id,
          item_id: itemId,
          direction,
          threshold_percent: thresholdPercent,
          is_active: isActive !== undefined ? isActive : true,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    const { data: alerts, error } = await (supabase
      .from('price_alerts')
      .select(`
        *,
        items:item_id (
          id,
          title,
          brand,
          image_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as any);

    if (error) throw error;

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
