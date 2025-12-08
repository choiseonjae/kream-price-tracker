import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { calculatePriceComparison, getExchangeRate } from '@/lib/utils/price-comparison';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Get price history
    const { data: priceSnapshots } = await supabase
      .from('price_snapshots')
      .select('*')
      .eq('item_id', id)
      .order('captured_at', { ascending: false })
      .limit(30);

    // Calculate latest comparison
    const latestKreamSnapshot = (priceSnapshots as any)?.find((s: any) => s.source === 'KREAM');
    const exchangeRate = await getExchangeRate();

    let comparison = null;
    if (latestKreamSnapshot) {
      // Mock JP price for MVP
      const mockJpPriceJpy = Math.round(latestKreamSnapshot.price / exchangeRate * 0.7);
      comparison = calculatePriceComparison(
        latestKreamSnapshot.price,
        mockJpPriceJpy,
        exchangeRate
      );
    }

    return NextResponse.json({
      item,
      priceHistory: priceSnapshots || [],
      comparison,
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
