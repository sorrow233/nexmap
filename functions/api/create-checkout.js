/**
 * Cloudflare Function: Create Stripe Checkout Session
 * 
 * Uses Stripe REST API directly to avoid npm dependency issues in Cloudflare Pages.
 */

// Stripe API Base URL
const STRIPE_API = 'https://api.stripe.com/v1';

// Products Configuration
const PRODUCTS = {
    'credits_100': {
        name: 'Starter Credits (100)',
        description: 'Supports ~200 conversations',
        amount: 99, // $0.99
        credits: 100
    },
    'credits_500': {
        name: 'Standard Credits (500)',
        description: 'Supports ~1,000 conversations',
        amount: 399, // $3.99
        credits: 500
    },
    'credits_2000': {
        name: 'Power Credits (2,000)',
        description: 'Supports ~4,000 conversations',
        amount: 999, // $9.99
        credits: 2000
    },
    'pro_lifetime': {
        name: 'NexMap Pro Lifetime',
        description: 'Unlimited AI Access (Bring Your Own Key)',
        amount: 1000, // $10.00
        isPro: true
    }
};

/**
 * Verify Firebase Token (Simplified)
 */
async function verifyToken(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;
        return payload.user_id || payload.sub;
    } catch (e) { return null; }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const userId = await verifyToken(token);

        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // 2. Parse Request
        const body = await request.json();
        const { productId, successUrl, cancelUrl } = body;
        const product = PRODUCTS[productId];

        if (!product) {
            return new Response(JSON.stringify({ error: 'Invalid product' }), { status: 400 });
        }

        // 3. Create Stripe Session via REST API
        const stripeKey = env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error('Stripe key not configured');

        // Build Form Data for Stripe API (x-www-form-urlencoded)
        const params = new URLSearchParams();
        params.append('mode', 'payment');
        params.append('success_url', successUrl || 'https://nexmap.catzz.work/gallery?payment=success');
        params.append('cancel_url', cancelUrl || 'https://nexmap.catzz.work/gallery?payment=cancelled');
        params.append('client_reference_id', userId);

        // Metadata to track what to give the user
        params.append('metadata[userId]', userId);
        params.append('metadata[productId]', productId);
        if (product.credits) params.append('metadata[credits]', product.credits);
        if (product.isPro) params.append('metadata[isPro]', 'true');

        // Line Items
        params.append('line_items[0][price_data][currency]', 'usd');
        params.append('line_items[0][price_data][product_data][name]', product.name);
        params.append('line_items[0][price_data][product_data][description]', product.description);
        params.append('line_items[0][price_data][unit_amount]', product.amount);
        params.append('line_items[0][quantity]', '1');

        // Custom branding options if needed
        // params.append('payment_intent_data[description]', `NexMap: ${product.name}`);

        const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const session = await stripeRes.json();

        if (session.error) {
            console.error('Stripe Error:', session.error);
            throw new Error(session.error.message);
        }

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
