import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { crawlKreamProduct } from '@/lib/crawler/kream';
import { calculatePriceComparison, getExchangeRate } from '@/lib/utils/price-comparison';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Get all unique items from watch_items
    const { data: watchItems } = await (supabase
      .from('watch_items')
      .select(`
        *,
        items:item_id (
          id,
          kream_url,
          title
        ),
        users:user_id (
          id,
          email
        )
      `) as any);

    if (!watchItems || watchItems.length === 0) {
      return NextResponse.json({
        message: 'No items to refresh',
        processed: 0,
      });
    }

    const exchangeRate = await getExchangeRate();
    const processedItems = new Set<string>();
    const alertsTriggered: any[] = [];

    for (const watchItem of watchItems) {
      const item = watchItem.items;
      const user = watchItem.users;

      // Skip if already processed
      if (processedItems.has(item.id)) {
        continue;
      }

      try {
        // Crawl latest price
        const productData = await crawlKreamProduct(item.kream_url);

        // Insert new price snapshot
        await (supabase
          .from('price_snapshots')
          .insert({
            item_id: item.id,
            source: 'KREAM',
            price: productData.price,
            currency: 'KRW',
          } as any));

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
          .eq('id', item.id);

        processedItems.add(item.id);

        // Check alerts for this item
        const { data: alerts } = await (supabase
          .from('price_alerts')
          .select('*')
          .eq('item_id', item.id)
          .eq('is_active', true) as any);

        if (alerts && alerts.length > 0) {
          // Calculate comparison
          const jpPriceJpy = watchItem.jp_reference_price || Math.round(productData.price / exchangeRate * 0.7);
          const comparison = calculatePriceComparison(
            productData.price,
            jpPriceJpy,
            exchangeRate
          );

          for (const alert of alerts) {
            let shouldTrigger = false;

            if (alert.direction === 'KR_MORE_EXPENSIVE') {
              shouldTrigger = comparison.diffPercent >= alert.threshold_percent;
            } else if (alert.direction === 'JP_MORE_EXPENSIVE') {
              shouldTrigger = comparison.diffPercent <= -alert.threshold_percent;
            }

            if (shouldTrigger) {
              // Get user email
              const { data: alertUser } = await (supabase
                .from('users')
                .select('email')
                .eq('id', alert.user_id)
                .single() as any);

              if (alertUser && process.env.RESEND_API_KEY) {
                alertsTriggered.push({
                  alert_id: alert.id,
                  user_email: alertUser.email,
                  item_title: item.title,
                  comparison,
                });

                // Send email
                try {
                  await resend.emails.send({
                    from: 'KREAM Price Tracker <noreply@yourdomain.com>',
                    to: alertUser.email,
                    subject: `가격 알림: ${item.title}`,
                    html: `
                      <h2>가격 알림이 발동되었습니다</h2>
                      <p><strong>${item.title}</strong></p>
                      <p>한국 가격: ₩${comparison.kreamPriceKr.toLocaleString()}</p>
                      <p>일본 가격: ¥${comparison.jpPriceJp.toLocaleString()} (₩${comparison.jpPriceKr.toLocaleString()})</p>
                      <p>가격 차이: ${comparison.diffPercent}%</p>
                      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/result?itemId=${item.id}">자세히 보기</a></p>
                    `,
                  });
                } catch (emailError) {
                  console.error('Failed to send email:', emailError);
                }
              }
            }
          }
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to process item ${item.id}:`, error);
      }
    }

    return NextResponse.json({
      message: 'Price refresh completed',
      processed: processedItems.size,
      alertsTriggered: alertsTriggered.length,
    });
  } catch (error) {
    console.error('Error in refresh-prices cron:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
