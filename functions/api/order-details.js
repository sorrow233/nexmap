/**
 * Cloudflare Function: Get Order Details
 * 
 * Retrieves order information from a Stripe checkout session.
 * Used to display order details after successful payment.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

// Support email for customer inquiries
const SUPPORT_EMAIL = 'support.nexmap@catzz.work';

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

export async function onRequestGet(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const userId = await verifyToken(token);

        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: corsHeaders
            });
        }

        // 2. Get session_id from query params
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'Missing session_id' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // 3. Fetch session from Stripe
        const stripeKey = env.STRIPE_SECRET_KEY;
        if (!stripeKey) throw new Error('Stripe key not configured');

        const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${stripeKey}`
            }
        });

        const session = await stripeRes.json();

        if (session.error) {
            console.error('Stripe Error:', session.error);
            return new Response(JSON.stringify({ error: 'Session not found' }), {
                status: 404,
                headers: corsHeaders
            });
        }

        // 4. Verify the session belongs to this user
        if (session.metadata?.userId !== userId && session.client_reference_id !== userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 403,
                headers: corsHeaders
            });
        }

        // 5. Return order details
        const orderDetails = {
            orderId: session.metadata?.orderId || `NM-${Date.now()}`,
            productId: session.metadata?.productId,
            credits: session.metadata?.credits ? parseInt(session.metadata.credits) : null,
            isPro: session.metadata?.isPro === 'true',
            amount: session.amount_total, // in cents
            currency: session.currency?.toUpperCase() || 'USD',
            status: session.payment_status,
            createdAt: session.created * 1000, // convert to ms
            customerEmail: session.customer_details?.email,
            supportEmail: SUPPORT_EMAIL
        };

        return new Response(JSON.stringify(orderDetails), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Order Details Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
