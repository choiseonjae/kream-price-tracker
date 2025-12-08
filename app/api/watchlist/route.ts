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
    const { itemId, action, jpReferencePrice, currency } = body;

    if (!itemId || !action) {
      return NextResponse.json(
        { error: 'itemId and action are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    if (action === 'add') {
      // Check plan limits
      const { data: userData } = await (supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single() as any);

      const plan = userData?.plan || 'FREE';
      const maxWatchlist = plan === 'PRO' ? 50 : 3;

      // Count existing watchlist items
      const { count } = await supabase
        .from('watch_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count || 0) >= maxWatchlist) {
        return NextResponse.json(
          {
            error: `워치리스트 한도를 초과했습니다. ${plan} 플랜은 최대 ${maxWatchlist}개까지 가능합니다.`,
          },
          { status: 403 }
        );
      }

      // Add to watchlist
      const { error } = await (supabase
        .from('watch_items')
        .insert({
          user_id: user.id,
          item_id: itemId,
          jp_reference_price: jpReferencePrice || null,
          currency: currency || 'JPY',
        } as any));

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          return NextResponse.json(
            { error: '이미 워치리스트에 추가된 아이템입니다.' },
            { status: 400 }
          );
        }
        throw error;
      }

      return NextResponse.json({ success: true });
    } else if (action === 'remove') {
      // Remove from watchlist
      const { error } = await supabase
        .from('watch_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in watchlist API:', error);
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

    const { data: watchItems, error } = await (supabase
      .from('watch_items')
      .select(`
        *,
        items:item_id (
          id,
          title,
          brand,
          image_url,
          kream_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as any);

    if (error) throw error;

    return NextResponse.json({ watchItems });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
