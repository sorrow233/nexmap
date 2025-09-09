export async function onRequest(context) {
    const { request } = context;

    return new Response(JSON.stringify({
        status: "ok",
        message: "Cloudflare Functions are working correctly",
        environment: context.env ? "exists" : "missing",
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
    }), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
