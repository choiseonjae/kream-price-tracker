import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { crawlKreamProduct, validateKreamUrl } from '@/lib/crawler/kream';
import { calculatePriceComparison, getExchangeRate } from '@/lib/utils/price-comparison';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!validateKreamUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid KREAM URL' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('items')
      .select('*')
      .eq('kream_url', url)
      .maybeSingle();

    let itemId: string;

    if (existingItem) {
      // Item exists, update it
      itemId = (existingItem as any).id;

      // Crawl latest data
      const productData = await crawlKreamProduct(url);

      // Update item
      await (supabase
        .from('items')
        .update as any)({
          title: productData.title,
          brand: productData.brand,
          model_code: productData.modelCode,
          image_url: productData.imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      // Insert new price snapshot
      await supabase
        .from('price_snapshots')
        .insert({
          item_id: itemId,
          source: 'KREAM',
          price: productData.price,
          currency: 'KRW',
        } as any);
    } else {
      // New item, crawl and create
      const productData = await crawlKreamProduct(url);

      // Insert item
      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert({
          kream_url: url,
          title: productData.title,
          brand: productData.brand,
          model_code: productData.modelCode,
          image_url: productData.imageUrl,
        } as any)
        .select()
        .single();

      if (itemError || !newItem) {
        throw new Error('Failed to create item');
      }

      itemId = (newItem as any).id;

      // Insert price snapshot
      await supabase
        .from('price_snapshots')
        .insert({
          item_id: itemId,
          source: 'KREAM',
          price: productData.price,
          currency: 'KRW',
        } as any);
    }

    // Get latest price snapshots
    const { data: priceSnapshots } = await supabase
      .from('price_snapshots')
      .select('*')
      .eq('item_id', itemId)
      .order('captured_at', { ascending: false })
      .limit(10);

    // Get exchange rate and calculate comparison
    const exchangeRate = await getExchangeRate();

    // For MVP, use a mock Japanese price (50% of Korean price as example)
    // TODO: Implement actual Japanese price fetching
    const latestKreamPrice = (priceSnapshots as any)?.[0]?.price || 0;
    const mockJpPriceJpy = Math.round(latestKreamPrice / exchangeRate * 0.7);

    const comparison = calculatePriceComparison(
      latestKreamPrice,
      mockJpPriceJpy,
      exchangeRate
    );

    return NextResponse.json({
      itemId,
      ...comparison,
      history: priceSnapshots,
    });
  } catch (error) {
    console.error('Error in analyze-kream API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
