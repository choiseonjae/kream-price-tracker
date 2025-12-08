import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature (implement based on Polar's documentation)
    // const signature = request.headers.get('polar-signature');
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { event, data } = body;

    if (event === 'checkout.succeeded') {
      // Handle successful checkout
      const { customer_email, product_id } = data;

      // Map product_id to plan
      const plan = product_id === process.env.POLAR_PRO_PRODUCT_ID ? 'PRO' : 'FREE';

      const supabase = createServerClient();

      // Update user plan
      const { error } = await (supabase
        .from('users')
        .update as any)({ plan })
        .eq('email', customer_email);

      if (error) {
        console.error('Failed to update user plan:', error);
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    if (event === 'subscription.cancelled') {
      // Handle subscription cancellation
      const { customer_email } = data;

      const supabase = createServerClient();

      // Downgrade to FREE plan
      const { error } = await (supabase
        .from('users')
        .update as any)({ plan: 'FREE' })
        .eq('email', customer_email);

      if (error) {
        console.error('Failed to downgrade user plan:', error);
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    // Unknown event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error in Polar webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
