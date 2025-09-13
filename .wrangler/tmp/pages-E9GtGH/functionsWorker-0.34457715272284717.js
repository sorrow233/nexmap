var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/create-checkout.js
var STRIPE_API = "https://api.stripe.com/v1";
var PRODUCTS = {
  "credits_500": {
    name: "Starter Credits (500)",
    description: "Supports ~1,000 conversations",
    amount: 99,
    // $0.99
    credits: 500
  },
  "credits_2000": {
    name: "Standard Credits (2,000)",
    description: "Supports ~4,000 conversations",
    amount: 399,
    // $3.99
    credits: 2e3
  },
  "credits_5000": {
    name: "Power Credits (5,000)",
    description: "Supports ~10,000 conversations",
    amount: 999,
    // $9.99
    credits: 5e3
  },
  "pro_lifetime": {
    name: "NexMap Pro Lifetime",
    description: "Unlimited AI Access (Bring Your Own Key)",
    amount: 1e3,
    // $10.00
    isPro: true
  }
};
async function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now) return null;
    return payload.user_id || payload.sub;
  } catch (e) {
    return null;
  }
}
__name(verifyToken, "verifyToken");
async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const userId = await verifyToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const body = await request.json();
    const { productId, successUrl, cancelUrl } = body;
    const product = PRODUCTS[productId];
    if (!product) {
      return new Response(JSON.stringify({ error: "Invalid product" }), { status: 400 });
    }
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe key not configured");
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", successUrl || "https://nexmap.catzz.work/gallery?payment=success");
    params.append("cancel_url", cancelUrl || "https://nexmap.catzz.work/gallery?payment=cancelled");
    params.append("client_reference_id", userId);
    params.append("metadata[userId]", userId);
    params.append("metadata[productId]", productId);
    if (product.credits) params.append("metadata[credits]", product.credits);
    if (product.isPro) params.append("metadata[isPro]", "true");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", product.name);
    params.append("line_items[0][price_data][product_data][description]", product.description);
    params.append("line_items[0][price_data][unit_amount]", product.amount);
    params.append("line_items[0][quantity]", "1");
    const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const session = await stripeRes.json();
    if (session.error) {
      console.error("Stripe Error:", session.error);
      throw new Error(session.error.message);
    }
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");

// api/webhook.js
async function onRequestPost2(context) {
  const { request, env } = context;
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  try {
    const bodyText = await request.text();
    const event = JSON.parse(bodyText);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, credits, isPro } = session.metadata || {};
      if (userId) {
        const kvKey = `credits:${userId}`;
        const data = await env.SYSTEM_CREDITS_KV.get(kvKey, "json") || {
          credits: 100,
          // Default starter
          isPro: false,
          createdAt: Date.now()
        };
        if (isPro === "true") {
          data.isPro = true;
          console.log(`[Stripe] Upgraded user ${userId} to PRO`);
        }
        if (credits) {
          const addAmount = parseInt(credits);
          data.credits = (data.credits || 0) + addAmount;
          console.log(`[Stripe] Added ${addAmount} credits to user ${userId}. New total: ${data.credits}`);
        }
        data.lastUpdated = Date.now();
        await env.SYSTEM_CREDITS_KV.put(kvKey, JSON.stringify(data));
      }
    }
    return new Response("Webhook Received", { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
__name(onRequestPost2, "onRequestPost");

// api/feedback.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const validEmailRegex = /^[^@\s]+@(gmail\.com|qq\.com|outlook\.com|hotmail\.com|live\.com|163\.com|126\.com|icloud\.com)$/i;
  return validEmailRegex.test(email.trim());
}
__name(isValidEmail, "isValidEmail");
function maskEmail(email) {
  if (!email) return "Anonymous";
  const [local, domain] = email.split("@");
  if (local.length <= 3) {
    return `${local[0]}**@${domain}`;
  }
  return `${local.substring(0, 3)}***@${domain}`;
}
__name(maskEmail, "maskEmail");
function calculateHotScore(votes, createdAt) {
  const ageInHours = (Date.now() - createdAt) / (1e3 * 60 * 60);
  const recencyBonus = Math.max(0, 48 - ageInHours) / 48;
  return votes + recencyBonus * 10;
}
__name(calculateHotScore, "calculateHotScore");
async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const projectId = "amecatzz";
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const authHeader = request.headers.get("Authorization");
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.has("feedbackId")) {
        return handleGetComments(request, firestoreBase, authHeader);
      }
      return handleGet(request, firestoreBase, authHeader);
    } else if (request.method === "POST") {
      const url = new URL(request.url);
      if (url.searchParams.has("feedbackId")) {
        return handlePostComment(request, firestoreBase, authHeader);
      }
      return handlePost(request, firestoreBase, authHeader);
    } else if (request.method === "PUT") {
      return handlePut(request, firestoreBase, authHeader);
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest, "onRequest");
function getFirestoreHeaders(authHeader) {
  const headers = { "Content-Type": "application/json" };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return headers;
}
__name(getFirestoreHeaders, "getFirestoreHeaders");
async function handleGet(request, firestoreBase, authHeader) {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") || "hot";
  try {
    const response = await fetch(`${firestoreBase}/feedback`, {
      headers: getFirestoreHeaders(authHeader)
    });
    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ feedbacks: [] }), {
          headers: corsHeaders
        });
      }
      if (response.status === 403) {
        console.warn("Firestore GET 403: Permission denied (User not logged in?)");
      }
      throw new Error(`Firestore error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    let feedbacks = (data.documents || []).map((doc) => {
      const fields = doc.fields || {};
      const id = doc.name.split("/").pop();
      const createdAt = fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue).getTime() : Date.now();
      const votes = parseInt(fields.votes?.integerValue || "0");
      return {
        id,
        email: maskEmail(fields.email?.stringValue),
        displayName: fields.displayName?.stringValue || null,
        photoURL: fields.photoURL?.stringValue || null,
        content: fields.content?.stringValue || fields.title?.stringValue || "",
        status: fields.status?.stringValue || "pending",
        votes,
        comments: parseInt(fields.comments?.integerValue || "0"),
        createdAt,
        hotScore: calculateHotScore(votes, createdAt)
      };
    });
    if (sort === "hot") {
      feedbacks.sort((a, b) => b.hotScore - a.hotScore);
    } else if (sort === "top") {
      feedbacks.sort((a, b) => b.votes - a.votes);
    } else if (sort === "recent") {
      feedbacks.sort((a, b) => b.createdAt - a.createdAt);
    }
    return new Response(JSON.stringify({ feedbacks }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("GET feedback error:", error);
    return new Response(JSON.stringify({ feedbacks: [], error: error.message }), {
      headers: corsHeaders
    });
  }
}
__name(handleGet, "handleGet");
async function handlePost(request, firestoreBase, authHeader) {
  const body = await request.json();
  const { email, content, displayName, photoURL, uid } = body;
  if (!uid && !isValidEmail(email)) {
    return new Response(JSON.stringify({
      error: "Invalid email. Only major email providers (Gmail, QQ, Outlook, 163, iCloud) are allowed.",
      code: "INVALID_EMAIL"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  if (!content || content.trim().length < 1) {
    return new Response(JSON.stringify({
      error: "Content is required.",
      code: "INVALID_CONTENT"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userEmail = uid ? email || `user_${uid}` : email.trim().toLowerCase();
  const firestoreDoc = {
    fields: {
      email: { stringValue: userEmail },
      content: { stringValue: content.trim() },
      displayName: { stringValue: displayName || "" },
      photoURL: { stringValue: photoURL || "" },
      uid: { stringValue: uid || "" },
      status: { stringValue: "pending" },
      votes: { integerValue: "1" },
      // Start with 1 vote (self-vote)
      voterEmails: {
        arrayValue: {
          values: [{ stringValue: userEmail }]
        }
      },
      comments: { integerValue: "0" },
      createdAt: { timestampValue: now }
    }
  };
  try {
    const response = await fetch(`${firestoreBase}/feedback?documentId=${feedbackId}`, {
      method: "POST",
      headers: getFirestoreHeaders(authHeader),
      body: JSON.stringify(firestoreDoc)
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create feedback: ${errorData}`);
    }
    return new Response(JSON.stringify({
      success: true,
      id: feedbackId,
      message: "Feedback submitted successfully!"
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("POST feedback error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handlePost, "handlePost");
async function handlePut(request, firestoreBase, authHeader) {
  const body = await request.json();
  const { feedbackId, action, uid } = body;
  if (!feedbackId) {
    return new Response(JSON.stringify({ error: "Feedback ID is required" }), {
      status: 400,
      headers: corsHeaders
    });
  }
  if (!uid) {
    return new Response(JSON.stringify({ error: "Login required to vote" }), {
      status: 401,
      headers: corsHeaders
    });
  }
  const voterIdentifier = uid;
  try {
    const getResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
      headers: getFirestoreHeaders(authHeader)
    });
    if (!getResponse.ok) {
      return new Response(JSON.stringify({ error: "Feedback not found" }), {
        status: 404,
        headers: corsHeaders
      });
    }
    const docData = await getResponse.json();
    const fields = docData.fields || {};
    let currentVotes = parseInt(fields.votes?.integerValue || "0");
    let voterUids = (fields.voterUids?.arrayValue?.values || []).map((v) => v.stringValue).filter(Boolean);
    if (voterUids.length === 0) {
      voterUids = (fields.voterEmails?.arrayValue?.values || []).map((v) => v.stringValue).filter(Boolean);
    }
    const hasVoted = voterUids.includes(voterIdentifier);
    if (action === "upvote") {
      if (hasVoted) {
        currentVotes = Math.max(0, currentVotes - 1);
        voterUids = voterUids.filter((e) => e !== voterIdentifier);
      } else {
        currentVotes += 1;
        voterUids.push(voterIdentifier);
      }
    } else if (action === "downvote") {
      if (hasVoted) {
        currentVotes = Math.max(0, currentVotes - 1);
        voterUids = voterUids.filter((e) => e !== voterIdentifier);
      }
    }
    const updateDoc = {
      fields: {
        ...fields,
        votes: { integerValue: String(currentVotes) },
        voterUids: {
          arrayValue: {
            values: voterUids.map((e) => ({ stringValue: e }))
          }
        }
      }
    };
    const updateResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
      method: "PATCH",
      headers: getFirestoreHeaders(authHeader),
      body: JSON.stringify(updateDoc)
    });
    if (!updateResponse.ok) {
      throw new Error("Failed to update feedback");
    }
    return new Response(JSON.stringify({ success: true, votes: currentVotes }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("PUT feedback error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handlePut, "handlePut");
async function handleGetComments(request, firestoreBase, authHeader) {
  const url = new URL(request.url);
  const feedbackId = url.searchParams.get("feedbackId");
  try {
    const response = await fetch(`${firestoreBase}/feedback/${feedbackId}/comments`, {
      headers: getFirestoreHeaders(authHeader)
    });
    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ comments: [] }), { headers: corsHeaders });
      }
      throw new Error(`Firestore error: ${response.status}`);
    }
    const data = await response.json();
    const comments = (data.documents || []).map((doc) => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split("/").pop(),
        email: maskEmail(fields.email?.stringValue),
        displayName: fields.displayName?.stringValue || null,
        photoURL: fields.photoURL?.stringValue || null,
        content: fields.content?.stringValue || "",
        createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue).getTime() : Date.now()
      };
    }).sort((a, b) => a.createdAt - b.createdAt);
    return new Response(JSON.stringify({ comments }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ comments: [], error: error.message }), { headers: corsHeaders });
  }
}
__name(handleGetComments, "handleGetComments");
async function handlePostComment(request, firestoreBase, authHeader) {
  const url = new URL(request.url);
  const feedbackId = url.searchParams.get("feedbackId");
  const body = await request.json();
  const { email, content, displayName, photoURL, uid } = body;
  if (!uid && !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: corsHeaders });
  }
  if (!content || !content.trim()) {
    return new Response(JSON.stringify({ error: "Content required" }), { status: 400, headers: corsHeaders });
  }
  const commentId = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userEmail = uid ? email || `user_${uid}` : email.trim().toLowerCase();
  const firestoreDoc = {
    fields: {
      email: { stringValue: userEmail },
      content: { stringValue: content.trim() },
      displayName: { stringValue: displayName || "" },
      photoURL: { stringValue: photoURL || "" },
      uid: { stringValue: uid || "" },
      createdAt: { timestampValue: now }
    }
  };
  try {
    const response = await fetch(`${firestoreBase}/feedback/${feedbackId}/comments?documentId=${commentId}`, {
      method: "POST",
      headers: getFirestoreHeaders(authHeader),
      body: JSON.stringify(firestoreDoc)
    });
    if (!response.ok) throw new Error("Failed to create comment");
    const getFbResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
      headers: getFirestoreHeaders(authHeader)
    });
    if (getFbResponse.ok) {
      const fbData = await getFbResponse.json();
      const currentComments = parseInt(fbData.fields?.comments?.integerValue || "0");
      await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: getFirestoreHeaders(authHeader),
        body: JSON.stringify({
          fields: { comments: { integerValue: String(currentComments + 1) } }
        })
      });
    }
    return new Response(JSON.stringify({ success: true, id: commentId }), { status: 201, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
__name(handlePostComment, "handlePostComment");

// api/gmi-serving.js
async function onRequest2(context) {
  const { request } = context;
  console.log(`[Proxy] Received request: ${request.method} ${request.url}`);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { apiKey, baseUrl, model, endpoint, method = "POST", requestBody, stream = false } = body;
    if (!apiKey || !baseUrl || !endpoint) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const authMethod = baseUrl.indexOf("gmi") !== -1 ? "bearer" : "query";
    let cleanModel = model;
    if (baseUrl.indexOf("gmi") !== -1 && model) {
      cleanModel = model.replace("google/", "");
    }
    let url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
    if (cleanModel && endpoint.includes(":")) {
      url = url.replace(":MODEL:", cleanModel);
    }
    if (authMethod === "query") {
      url += `?key=${apiKey}`;
    }
    const headers = {
      "Content-Type": "application/json"
    };
    if (authMethod === "bearer") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    console.log(`[Proxy] Forwarding to: ${url}`);
    const upstreamResponse = await fetch(url, {
      method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : void 0
    });
    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      console.error(`[Proxy] Upstream error ${upstreamResponse.status}:`, errText);
      return new Response(JSON.stringify({
        error: { message: `Upstream Error ${upstreamResponse.status}: ${errText}` }
      }), {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (stream) {
      const { readable, writable } = new TransformStream();
      upstreamResponse.body.pipeTo(writable);
      return new Response(readable, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no"
          // Nginx hint
        }
      });
    }
    const data = await upstreamResponse.json();
    return new Response(JSON.stringify(data), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("[GMI Proxy] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(onRequest2, "onRequest");

// api/image-gen.js
async function onRequest3(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { action, apiKey, payload, requestId } = body;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    let response;
    if (action === "submit") {
      response = await fetch("https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } else if (action === "poll") {
      if (!requestId) {
        return new Response(JSON.stringify({ error: "Request ID is required for polling" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      response = await fetch(`https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${requestId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "submit" or "poll"' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = await response.json().catch(async (jsonError) => {
      const text = await response.text();
      console.error("[Image Gen Proxy] Failed to parse JSON response:", text);
      throw new Error(`GMI API returned invalid JSON: ${text.substring(0, 200)}`);
    });
    console.log("[Image Gen Proxy] GMI API response status:", response.status);
    console.log("[Image Gen Proxy] GMI API response data:", JSON.stringify(data).substring(0, 200));
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("[Image Gen Proxy] Detailed error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({
      error: error.message || "Internal server error",
      details: error.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(onRequest3, "onRequest");

// api/image-proxy.js
async function onRequest4(context) {
  const { request } = context;
  const corsHeaders2 = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders2 });
  }
  try {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders2, "Content-Type": "application/json" }
      });
    }
    if (!imageUrl.startsWith("https://storage.googleapis.com/gmi-video-assests-prod/")) {
      return new Response(JSON.stringify({ error: "Invalid image URL" }), {
        status: 403,
        headers: { ...corsHeaders2, "Content-Type": "application/json" }
      });
    }
    console.log("[Image Proxy] Fetching:", imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("[Image Proxy] Failed to fetch:", response.status, response.statusText);
      return new Response(JSON.stringify({
        error: "Failed to fetch image",
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders2, "Content-Type": "application/json" }
      });
    }
    const contentType = response.headers.get("Content-Type") || "image/png";
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders2,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
        // Cache for 24h
      }
    });
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders2, "Content-Type": "application/json" }
    });
  }
}
__name(onRequest4, "onRequest");

// api/system-credits.js
var SYSTEM_MODEL = "deepseek-ai/DeepSeek-V3.2";
var SYSTEM_BASE_URL = "https://api.gmi-serving.com/v1";
var PRICING = {
  INPUT_PER_MILLION: 150,
  // 150 credits per million input tokens
  OUTPUT_PER_MILLION: 200
  // 200 credits per million output tokens
};
var INITIAL_CREDITS = 100;
function calculateCreditsUsed(inputTokens, outputTokens) {
  const inputCost = inputTokens / 1e6 * PRICING.INPUT_PER_MILLION;
  const outputCost = outputTokens / 1e6 * PRICING.OUTPUT_PER_MILLION;
  return inputCost + outputCost;
}
__name(calculateCreditsUsed, "calculateCreditsUsed");
async function verifyFirebaseToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now) {
      console.log("[SystemCredits] Token expired");
      return null;
    }
    return payload.user_id || payload.sub;
  } catch (e) {
    console.error("[SystemCredits] Token verification failed:", e);
    return null;
  }
}
__name(verifyFirebaseToken, "verifyFirebaseToken");
async function getUserCredits(env, userId) {
  const key = `credits:${userId}`;
  const data = await env.SYSTEM_CREDITS_KV?.get(key, "json");
  if (!data) {
    const newData = {
      credits: INITIAL_CREDITS,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(newData));
    return newData;
  }
  return data;
}
__name(getUserCredits, "getUserCredits");
async function updateUserCredits(env, userId, newCredits) {
  const key = `credits:${userId}`;
  const data = {
    credits: Math.max(0, newCredits),
    // Never go below 0
    lastUpdated: Date.now()
  };
  await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(data));
  return data.credits;
}
__name(updateUserCredits, "updateUserCredits");
async function onRequest5(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const userId = await verifyFirebaseToken(token);
    if (!userId) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "\u8BF7\u5148\u767B\u5F55\u4EE5\u4F7F\u7528\u514D\u8D39\u8BD5\u7528\u79EF\u5206"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const systemApiKey = env.SYSTEM_GMI_API_KEY;
    if (!systemApiKey) {
      console.error("[SystemCredits] SYSTEM_GMI_API_KEY not configured!");
      return new Response(JSON.stringify({
        error: "Service unavailable",
        message: "\u7CFB\u7EDF\u914D\u7F6E\u9519\u8BEF\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458"
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const userData = await getUserCredits(env, userId);
    if (userData.credits <= 0) {
      return new Response(JSON.stringify({
        error: "Credits exhausted",
        message: "\u514D\u8D39\u8BD5\u7528\u79EF\u5206\u5DF2\u7528\u5B8C\uFF01\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u60A8\u81EA\u5DF1\u7684 API Key \u7EE7\u7EED\u4F7F\u7528\u3002",
        credits: 0,
        needsUpgrade: true
      }), {
        status: 402,
        // Payment Required
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const body = await request.json();
    const { requestBody, stream = false, action } = body;
    if (action === "check") {
      return new Response(JSON.stringify({
        credits: userData.credits,
        initialCredits: INITIAL_CREDITS,
        model: SYSTEM_MODEL
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (!requestBody) {
      return new Response(JSON.stringify({ error: "Missing requestBody" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const endpoint = "/chat/completions";
    const url = `${SYSTEM_BASE_URL}${endpoint}`;
    console.log(`[SystemCredits] User ${userId} (${userData.credits.toFixed(2)} credits) -> ${url} [OpenAI]`);
    const openaiBody = {
      ...requestBody,
      model: SYSTEM_MODEL,
      // Force correct model
      stream,
      stream_options: stream ? { include_usage: true } : void 0
      // Request usage metrics in stream
    };
    const upstreamResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${systemApiKey}`
      },
      body: JSON.stringify(openaiBody)
    });
    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      console.error(`[SystemCredits] Upstream error ${upstreamResponse.status}:`, errText);
      return new Response(JSON.stringify({
        error: { message: `AI Error: ${errText}` }
      }), {
        status: upstreamResponse.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (stream) {
      const { readable, writable } = new TransformStream();
      const processStream = /* @__PURE__ */ __name(async () => {
        const reader = upstreamResponse.body.getReader();
        const writer = writable.getWriter();
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let buffer = "";
        try {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
              if (line.trim().startsWith("data: ")) {
                const dataStr = line.trim().substring(6);
                if (dataStr === "[DONE]") continue;
                try {
                  const data2 = JSON.parse(dataStr);
                  if (data2.usage) {
                    totalInputTokens = data2.usage.prompt_tokens || totalInputTokens;
                    totalOutputTokens = data2.usage.completion_tokens || totalOutputTokens;
                  }
                } catch (e) {
                }
              }
            }
          }
        } finally {
          writer.close();
          if (totalInputTokens === 0 && totalOutputTokens === 0) {
            console.warn("[SystemCredits] No usage stats in stream");
          }
          if (totalInputTokens > 0 || totalOutputTokens > 0) {
            const creditsUsed2 = calculateCreditsUsed(totalInputTokens, totalOutputTokens);
            const newCredits2 = await updateUserCredits(env, userId, userData.credits - creditsUsed2);
            console.log(`[SystemCredits] User ${userId} used ${creditsUsed2.toFixed(4)} credits (${totalInputTokens}in/${totalOutputTokens}out). Remaining: ${newCredits2.toFixed(2)}`);
          }
        }
      }, "processStream");
      context.waitUntil(processStream());
      return new Response(readable, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no"
        }
      });
    }
    const data = await upstreamResponse.json();
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const creditsUsed = calculateCreditsUsed(inputTokens, outputTokens);
    const newCredits = await updateUserCredits(env, userId, userData.credits - creditsUsed);
    console.log(`[SystemCredits] User ${userId} used ${creditsUsed.toFixed(4)} credits. Remaining: ${newCredits.toFixed(2)}`);
    return new Response(JSON.stringify({
      ...data,
      _systemCredits: {
        used: creditsUsed,
        remaining: newCredits
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    console.error("[SystemCredits] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
__name(onRequest5, "onRequest");

// api/test.js
async function onRequest6(context) {
  const { request } = context;
  return new Response(JSON.stringify({
    status: "ok",
    message: "Cloudflare Functions are working correctly",
    environment: context.env ? "exists" : "missing",
    url: request.url,
    method: request.method,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(onRequest6, "onRequest");

// ../.wrangler/tmp/pages-E9GtGH/functionsRoutes-0.9069604232188632.mjs
var routes = [
  {
    routePath: "/api/create-checkout",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/webhook",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/feedback",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/gmi-serving",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/image-gen",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/image-proxy",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/system-credits",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/test",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  }
];

// ../../../../.npm/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
