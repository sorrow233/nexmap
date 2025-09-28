var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// utils/auth.js
async function verifyFirebaseToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now) {
      console.log("[Auth] Token expired");
      return null;
    }
    return payload.user_id || payload.sub;
  } catch (e) {
    console.error("[Auth] Token verification failed:", e);
    return null;
  }
}
__name(verifyFirebaseToken, "verifyFirebaseToken");

// api/admin/codes.js
function generateCode(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}`;
}
__name(generateCode, "generateCode");
async function onRequest(context) {
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const userId = await verifyFirebaseToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const adminUids = (env.ADMIN_UIDS || "").split(",").map((id) => id.trim());
    if (!adminUids.includes(userId)) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
    }
    const { amount = 50, count = 1, note = "", type = "credits" } = await request.json();
    const safeAmount = Math.min(Math.max(1, parseInt(amount) || 50), 1e4);
    const safeCount = Math.min(Math.max(1, parseInt(count) || 1), 50);
    const generatedCodes = [];
    for (let i = 0; i < safeCount; i++) {
      const code = generateCode();
      const codeData = {
        code,
        value: type === "pro" ? "PRO_STATUS" : safeAmount,
        type,
        // 'credits' (default) or 'pro'
        status: "active",
        // active, redeemed
        createdAt: Date.now(),
        createdBy: userId,
        note
      };
      await env.SYSTEM_CREDITS_KV.put(`code:${code}`, JSON.stringify(codeData), {
        expirationTtl: 31536e3
        // 1 year
      });
      generatedCodes.push(codeData);
    }
    return new Response(JSON.stringify({
      success: true,
      codes: generatedCodes,
      message: `Successfully generated ${safeCount} ${type === "pro" ? "PRO" : "credit"} codes`
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
__name(onRequest, "onRequest");

// api/create-checkout.js
var STRIPE_API = "https://api.stripe.com/v1";
var PRODUCTS = {
  "credits_500": {
    name: "Starter Chat Pack (600)",
    description: "600 AI conversations",
    amount: 99,
    // $0.99
    chats: 600
  },
  "credits_2000": {
    name: "Standard Chat Pack (3,000)",
    description: "3,000 AI conversations",
    amount: 399,
    // $3.99
    chats: 3e3
  },
  "credits_5000": {
    name: "Power Chat Pack (9,000)",
    description: "9,000 AI conversations",
    amount: 999,
    // $9.99
    chats: 9e3
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
    if (product.chats) params.append("metadata[credits]", product.chats);
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
      const { userId, credits, chats, isPro } = session.metadata || {};
      if (userId) {
        const kvKey = `usage:${userId}`;
        const data = await env.SYSTEM_CREDITS_KV.get(kvKey, "json") || {
          conversationCount: 0,
          bonusCredits: 0,
          isPro: false,
          createdAt: Date.now()
        };
        if (isPro === "true") {
          data.isPro = true;
          if (!data.proSince) data.proSince = Date.now();
          console.log(`[Stripe] Upgraded user ${userId} to PRO`);
        }
        const addAmount = parseInt(credits || chats || "0");
        if (addAmount > 0) {
          data.bonusCredits = (data.bonusCredits || 0) + addAmount;
          console.log(`[Stripe] Added ${addAmount} bonus credits to user ${userId}. New bonus total: ${data.bonusCredits}`);
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
async function onRequest2(context) {
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
__name(onRequest2, "onRequest");
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
async function onRequest3(context) {
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
      "Content-Type": "application/json",
      "User-Agent": "NexMap/1.0 (https://nexmap.catzz.work)",
      "Accept": "application/json, text/event-stream",
      "Accept-Language": "en-US,en;q=0.9"
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
__name(onRequest3, "onRequest");

// api/image-gen.js
async function onRequest4(context) {
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
__name(onRequest4, "onRequest");

// api/image-proxy.js
async function onRequest5(context) {
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
__name(onRequest5, "onRequest");

// utils/weekUtils.js
function getCurrentWeekNumber() {
  const now = /* @__PURE__ */ new Date();
  const thursday = new Date(now);
  thursday.setDate(now.getDate() - (now.getDay() + 6) % 7 + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - (firstThursday.getDay() + 6) % 7 + 3);
  const weekNumber = Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1e3)) + 1;
  return `${thursday.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}
__name(getCurrentWeekNumber, "getCurrentWeekNumber");

// api/redeem.js
async function onRequest6(context) {
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const userId = await verifyFirebaseToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "\u8BF7\u5148\u767B\u5F55" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const normalizedCode = code.toUpperCase().trim();
    const codeKey = `code:${normalizedCode}`;
    const codeData = await env.SYSTEM_CREDITS_KV.get(codeKey, "json");
    if (!codeData) {
      return new Response(JSON.stringify({ error: "Invalid code", message: "\u65E0\u6548\u7684\u5151\u6362\u7801" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (codeData.status !== "active") {
      return new Response(JSON.stringify({ error: "Code already redeemed", message: "\u8BE5\u5151\u6362\u7801\u5DF2\u88AB\u4F7F\u7528" }), {
        status: 409,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const redeemedCodeData = {
      ...codeData,
      status: "redeemed",
      redeemedBy: userId,
      redeemedAt: Date.now()
    };
    await env.SYSTEM_CREDITS_KV.put(codeKey, JSON.stringify(redeemedCodeData));
    const userKey = `usage:${userId}`;
    const userData = await env.SYSTEM_CREDITS_KV.get(userKey, "json") || {
      conversationCount: 0,
      imageCount: 0,
      week: getCurrentWeekNumber(),
      bonusCredits: 0,
      createdAt: Date.now()
    };
    let updatedUserData = { ...userData };
    let responseMessage = "";
    let addedCredits = 0;
    let totalBonus = userData.bonusCredits || 0;
    if (codeData.type === "pro") {
      updatedUserData.isPro = true;
      updatedUserData.proSince = Date.now();
      responseMessage = "\u606D\u559C\uFF01\u60A8\u5DF2\u6210\u529F\u5347\u7EA7\u4E3A Pro \u7528\u6237\uFF01";
    } else {
      addedCredits = codeData.value;
      totalBonus = (userData.bonusCredits || 0) + addedCredits;
      updatedUserData.bonusCredits = totalBonus;
      updatedUserData.lastBonusAdded = Date.now();
      responseMessage = `\u6210\u529F\u5151\u6362 ${codeData.value} \u79EF\u5206\uFF01`;
    }
    await env.SYSTEM_CREDITS_KV.put(userKey, JSON.stringify(updatedUserData));
    return new Response(JSON.stringify({
      success: true,
      addedCredits,
      totalBonus,
      isPro: updatedUserData.isPro,
      // Return Pro status
      message: responseMessage
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    console.error("Redemption error:", error);
    return new Response(JSON.stringify({ error: "Server error", message: "\u5151\u6362\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
__name(onRequest6, "onRequest");

// api/system-credits.js
var CONVERSATION_MODEL = "moonshotai/Kimi-K2-Thinking";
var ANALYSIS_MODEL = "deepseek-ai/DeepSeek-V3.2";
var SYSTEM_BASE_URL = "https://api.gmi-serving.com/v1";
var IMAGE_MODEL = "seedream-4-0-250828";
var IMAGE_API_BASE = "https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey";
var WEEKLY_CONVERSATION_LIMIT = 200;
var WEEKLY_IMAGE_LIMIT = 20;
var IMAGE_STYLE_PREFIX = "\u3044\u3089\u3059\u3068\u3084 style by \u307F\u3075\u306D\u305F\u304B\u3057 (Takashi Mifune). Japanese free clip art, white background. ";
async function getUserUsage(env, userId) {
  const key = `usage:${userId}`;
  const data = await env.SYSTEM_CREDITS_KV?.get(key, "json");
  const currentWeek = getCurrentWeekNumber();
  if (!data || data.week !== currentWeek) {
    const previousBonus = data?.bonusCredits || 0;
    const newData = {
      conversationCount: 0,
      imageCount: 0,
      week: currentWeek,
      bonusCredits: previousBonus,
      // Preserve bonus credits
      createdAt: data?.createdAt || Date.now(),
      lastUpdated: Date.now()
    };
    await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(newData));
    return newData;
  }
  if (data.imageCount === void 0) {
    data.imageCount = 0;
  }
  return data;
}
__name(getUserUsage, "getUserUsage");
async function incrementConversationCount(env, userId, currentData) {
  const key = `usage:${userId}`;
  const data = {
    ...currentData,
    conversationCount: currentData.conversationCount + 1,
    lastUpdated: Date.now()
  };
  await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(data));
  return data;
}
__name(incrementConversationCount, "incrementConversationCount");
async function incrementImageCount(env, userId, currentData) {
  const key = `usage:${userId}`;
  const data = {
    ...currentData,
    imageCount: (currentData.imageCount || 0) + 1,
    lastUpdated: Date.now()
  };
  await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(data));
  return data;
}
__name(incrementImageCount, "incrementImageCount");
async function onRequest7(context) {
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
        message: "\u8BF7\u5148\u767B\u5F55\u4EE5\u4F7F\u7528\u514D\u8D39\u8BD5\u7528\u529F\u80FD"
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
    const usageData = await getUserUsage(env, userId);
    const adminUids = (env.ADMIN_UIDS || "").split(",").map((id) => id.trim()).filter((id) => id.length > 0);
    const isUserAdmin = adminUids.includes(userId);
    console.log("[SystemCredits] Admin check:", { userId, adminUids, isUserAdmin });
    const body = await request.json();
    const { requestBody, stream = false, action, taskType } = body;
    if (action === "check") {
      return new Response(JSON.stringify({
        conversationCount: usageData.conversationCount,
        weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
        bonusCredits: usageData.bonusCredits || 0,
        remaining: WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0) - usageData.conversationCount,
        week: usageData.week,
        model: CONVERSATION_MODEL,
        // Image quota info
        imageCount: usageData.imageCount || 0,
        imageLimit: WEEKLY_IMAGE_LIMIT,
        imageRemaining: WEEKLY_IMAGE_LIMIT - (usageData.imageCount || 0),
        imageModel: IMAGE_MODEL,
        // Legacy compatibility
        credits: WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0) - usageData.conversationCount,
        initialCredits: WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0),
        isPro: !!usageData.isPro,
        isAdmin: isUserAdmin
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (action === "image") {
      const { prompt, size = "1024x1024", watermark = false } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt is required for image generation" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const imageCount = usageData.imageCount || 0;
      if (imageCount >= WEEKLY_IMAGE_LIMIT) {
        return new Response(JSON.stringify({
          error: "Image limit reached",
          message: `\u672C\u5468\u514D\u8D39\u56FE\u7247\u751F\u6210\u6B21\u6570\uFF08${WEEKLY_IMAGE_LIMIT}\u6B21\uFF09\u5DF2\u7528\u5B8C\uFF01\u6BCF\u5468\u4E00\u91CD\u7F6E\u3002\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u60A8\u81EA\u5DF1\u7684 API Key \u7EE7\u7EED\u4F7F\u7528\u3002`,
          imageCount,
          imageLimit: WEEKLY_IMAGE_LIMIT,
          imageRemaining: 0,
          needsUpgrade: true
        }), {
          status: 402,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      try {
        console.log(`[SystemCredits] User ${userId} generating image (${imageCount}/${WEEKLY_IMAGE_LIMIT}): ${prompt.substring(0, 50)}...`);
        const submitResponse = await fetch(`${IMAGE_API_BASE}/requests`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${systemApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: IMAGE_MODEL,
            payload: {
              // Prepend style prefix for consistent みふねたかし/Irasutoya style
              prompt: IMAGE_STYLE_PREFIX + prompt,
              size,
              max_images: 1,
              watermark
            }
          })
        });
        if (!submitResponse.ok) {
          const err = await submitResponse.json().catch(() => ({}));
          console.error("[SystemCredits] Image submit failed:", err);
          return new Response(JSON.stringify({
            error: "Image generation failed",
            message: err.error?.message || err.error || "Failed to submit image request"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        const submitData = await submitResponse.json();
        const requestId = submitData.request_id;
        if (!requestId) {
          console.error("[SystemCredits] No request_id in response:", submitData);
          return new Response(JSON.stringify({
            error: "Image generation failed",
            message: "No request ID returned from API"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        console.log(`[SystemCredits] Image request queued: ${requestId}`);
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2e3));
          attempts++;
          const pollResponse = await fetch(`${IMAGE_API_BASE}/requests/${requestId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${systemApiKey}`
            }
          });
          if (!pollResponse.ok) {
            console.warn(`[SystemCredits] Poll attempt ${attempts} failed:`, pollResponse.status);
            continue;
          }
          const pollData = await pollResponse.json();
          if (pollData.status === "success") {
            const imageUrl = pollData.outcome?.media_urls?.[0]?.url;
            if (!imageUrl) {
              return new Response(JSON.stringify({
                error: "Image generation failed",
                message: "Image generated but no URL returned"
              }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
            const updatedUsage = await incrementImageCount(env, userId, usageData);
            console.log(`[SystemCredits] User ${userId} image generation success. Count: ${updatedUsage.imageCount}/${WEEKLY_IMAGE_LIMIT}`);
            return new Response(JSON.stringify({
              url: imageUrl,
              imageCount: updatedUsage.imageCount,
              imageLimit: WEEKLY_IMAGE_LIMIT,
              imageRemaining: WEEKLY_IMAGE_LIMIT - updatedUsage.imageCount
            }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
          if (pollData.status === "failed" || pollData.status === "cancelled") {
            console.error("[SystemCredits] Image generation failed:", pollData);
            return new Response(JSON.stringify({
              error: "Image generation failed",
              message: pollData.error || pollData.message || "Generation failed"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        }
        return new Response(JSON.stringify({
          error: "Image generation timeout",
          message: "Image generation timed out after 60 seconds"
        }), {
          status: 504,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (error) {
        console.error("[SystemCredits] Image generation error:", error);
        return new Response(JSON.stringify({
          error: "Image generation failed",
          message: error.message || "Internal server error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    const isConversation = taskType !== "analysis";
    const selectedModel = isConversation ? CONVERSATION_MODEL : ANALYSIS_MODEL;
    const effectiveLimit = WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0);
    if (isConversation && usageData.conversationCount >= effectiveLimit) {
      return new Response(JSON.stringify({
        error: "Limit reached",
        message: `\u672C\u5468\u514D\u8D39\u5BF9\u8BDD\u6B21\u6570\uFF08${effectiveLimit}\u6B21\uFF0C\u542B\u5956\u52B1\uFF09\u5DF2\u7528\u5B8C\uFF01\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u60A8\u81EA\u5DF1\u7684 API Key \u7EE7\u7EED\u4F7F\u7528\u3002`,
        conversationCount: usageData.conversationCount,
        weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
        bonusCredits: usageData.bonusCredits || 0,
        remaining: 0,
        needsUpgrade: true,
        // Legacy compatibility
        credits: 0
      }), {
        status: 402,
        // Payment Required
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
    console.log(`[SystemCredits] User ${userId} (${usageData.conversationCount}/${WEEKLY_CONVERSATION_LIMIT} this week) -> ${url} [${selectedModel}]`);
    const openaiBody = {
      ...requestBody,
      model: selectedModel,
      stream,
      // Enable reasoning mode with recommended settings for Kimi-K2-Thinking
      temperature: selectedModel === CONVERSATION_MODEL ? 1 : requestBody.temperature || 0.7,
      max_tokens: requestBody.max_tokens || 16384,
      // Higher limit for reasoning chains
      stream_options: stream ? { include_usage: true } : void 0
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
    let updatedUsageData = usageData;
    if (isConversation) {
      updatedUsageData = await incrementConversationCount(env, userId, usageData);
      console.log(`[SystemCredits] User ${userId} conversation count: ${updatedUsageData.conversationCount}/${WEEKLY_CONVERSATION_LIMIT}`);
    }
    if (stream) {
      const { readable, writable } = new TransformStream();
      const processStream = /* @__PURE__ */ __name(async () => {
        const reader = upstreamResponse.body.getReader();
        const writer = writable.getWriter();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        } finally {
          writer.close();
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
    return new Response(JSON.stringify({
      ...data,
      _systemCredits: {
        conversationCount: updatedUsageData.conversationCount,
        weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
        bonusCredits: updatedUsageData.bonusCredits || 0,
        remaining: WEEKLY_CONVERSATION_LIMIT + (updatedUsageData.bonusCredits || 0) - updatedUsageData.conversationCount
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
__name(onRequest7, "onRequest");

// api/test.js
async function onRequest8(context) {
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
__name(onRequest8, "onRequest");

// ../src/config/seoConfig.js
var BASE_URL = "https://nexmap.catzz.work";
var LANGUAGES = ["en", "zh", "ja", "ko"];
var SEO_CONFIG = {
  // Default / Home
  "/": {
    en: {
      title: "NexMap - AI-Powered Infinite Canvas Mind Map",
      description: "Visualize your thoughts with AI. Multi-modal chat, spatial organization, and recursive exploration on an infinite canvas. Free to use.",
      ogTitle: "NexMap - AI-Powered Infinite Canvas Mind Map",
      ogDescription: "Visualize your thoughts with AI on an infinite canvas. Free multi-modal mind mapping.",
      keywords: "AI mind map, infinite canvas, visual thinking, mind mapping tool, AI chat, brainstorming, knowledge management, spatial notes"
    },
    zh: {
      title: "NexMap - AI\u9A71\u52A8\u7684\u65E0\u9650\u753B\u5E03\u601D\u7EF4\u5BFC\u56FE",
      description: "\u7528AI\u53EF\u89C6\u5316\u4F60\u7684\u601D\u7EF4\u3002\u591A\u6A21\u6001\u5BF9\u8BDD\u3001\u7A7A\u95F4\u7EC4\u7EC7\u548C\u9012\u5F52\u63A2\u7D22\uFF0C\u5C3D\u5728\u65E0\u9650\u753B\u5E03\u3002\u514D\u8D39\u4F7F\u7528\u3002",
      ogTitle: "NexMap - AI\u9A71\u52A8\u7684\u65E0\u9650\u753B\u5E03\u601D\u7EF4\u5BFC\u56FE",
      ogDescription: "\u7528AI\u5728\u65E0\u9650\u753B\u5E03\u4E0A\u53EF\u89C6\u5316\u4F60\u7684\u601D\u7EF4\u3002\u514D\u8D39\u7684\u591A\u6A21\u6001\u601D\u7EF4\u5BFC\u56FE\u5DE5\u5177\u3002",
      keywords: "AI\u601D\u7EF4\u5BFC\u56FE, \u65E0\u9650\u753B\u5E03, \u89C6\u89C9\u601D\u7EF4, \u601D\u7EF4\u5BFC\u56FE\u5DE5\u5177, AI\u5BF9\u8BDD, \u5934\u8111\u98CE\u66B4, \u77E5\u8BC6\u7BA1\u7406, \u7A7A\u95F4\u7B14\u8BB0"
    },
    ja: {
      title: "NexMap - AI\u642D\u8F09\u306E\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7",
      description: "AI\u3067\u601D\u8003\u3092\u53EF\u8996\u5316\u3002\u30DE\u30EB\u30C1\u30E2\u30FC\u30C0\u30EB\u30C1\u30E3\u30C3\u30C8\u3001\u7A7A\u9593\u6574\u7406\u3001\u518D\u5E30\u7684\u63A2\u7D22\u3092\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u3067\u3002\u7121\u6599\u3067\u3054\u5229\u7528\u3044\u305F\u3060\u3051\u307E\u3059\u3002",
      ogTitle: "NexMap - AI\u642D\u8F09\u306E\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7",
      ogDescription: "AI\u3067\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u4E0A\u306B\u601D\u8003\u3092\u53EF\u8996\u5316\u3002\u7121\u6599\u306E\u30DE\u30EB\u30C1\u30E2\u30FC\u30C0\u30EB\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D4\u30F3\u30B0\u3002",
      keywords: "AI\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7, \u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9, \u8996\u899A\u7684\u601D\u8003, \u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7\u30C4\u30FC\u30EB, AI\u30C1\u30E3\u30C3\u30C8, \u30D6\u30EC\u30A4\u30F3\u30B9\u30C8\u30FC\u30DF\u30F3\u30B0, \u77E5\u8B58\u7BA1\u7406, \u7A7A\u9593\u30CE\u30FC\u30C8"
    },
    ko: {
      title: "NexMap - AI \uAE30\uBC18 \uBB34\uD55C \uCE94\uBC84\uC2A4 \uB9C8\uC778\uB4DC\uB9F5",
      description: "AI\uB85C \uC0DD\uAC01\uC744 \uC2DC\uAC01\uD654\uD558\uC138\uC694. \uBA40\uD2F0\uBAA8\uB2EC \uCC44\uD305, \uACF5\uAC04 \uAD6C\uC131, \uC7AC\uADC0\uC801 \uD0D0\uC0C9\uC744 \uBB34\uD55C \uCE94\uBC84\uC2A4\uC5D0\uC11C. \uBB34\uB8CC\uB85C \uC0AC\uC6A9\uD558\uC138\uC694.",
      ogTitle: "NexMap - AI \uAE30\uBC18 \uBB34\uD55C \uCE94\uBC84\uC2A4 \uB9C8\uC778\uB4DC\uB9F5",
      ogDescription: "AI\uB85C \uBB34\uD55C \uCE94\uBC84\uC2A4\uC5D0\uC11C \uC0DD\uAC01\uC744 \uC2DC\uAC01\uD654\uD558\uC138\uC694. \uBB34\uB8CC \uBA40\uD2F0\uBAA8\uB2EC \uB9C8\uC778\uB4DC\uB9F5 \uB3C4\uAD6C.",
      keywords: "AI \uB9C8\uC778\uB4DC\uB9F5, \uBB34\uD55C \uCE94\uBC84\uC2A4, \uC2DC\uAC01\uC801 \uC0AC\uACE0, \uB9C8\uC778\uB4DC\uB9F5 \uB3C4\uAD6C, AI \uCC44\uD305, \uBE0C\uB808\uC778\uC2A4\uD1A0\uBC0D, \uC9C0\uC2DD \uAD00\uB9AC, \uACF5\uAC04 \uB178\uD2B8"
    }
  },
  // Pricing
  "/pricing": {
    en: {
      title: "Pricing - NexMap | Simple, Transparent Plans",
      description: "Choose the perfect plan for your spatial thinking needs. Free tier available, Pro lifetime with unlimited canvas and BYOK support."
    },
    zh: {
      title: "\u4EF7\u683C\u65B9\u6848 - NexMap | \u7B80\u5355\u900F\u660E\u7684\u5B9A\u4EF7",
      description: "\u9009\u62E9\u9002\u5408\u60A8\u7A7A\u95F4\u601D\u7EF4\u9700\u6C42\u7684\u5B8C\u7F8E\u65B9\u6848\u3002\u63D0\u4F9B\u514D\u8D39\u5C42\uFF0CPro\u7EC8\u8EAB\u7248\u652F\u6301\u65E0\u9650\u753B\u5E03\u548C\u81EA\u5E26API\u5BC6\u94A5\u3002"
    },
    ja: {
      title: "\u6599\u91D1\u30D7\u30E9\u30F3 - NexMap | \u30B7\u30F3\u30D7\u30EB\u3067\u900F\u660E\u306A\u4FA1\u683C\u8A2D\u5B9A",
      description: "\u3042\u306A\u305F\u306E\u7A7A\u9593\u601D\u8003\u30CB\u30FC\u30BA\u306B\u6700\u9069\u306A\u30D7\u30E9\u30F3\u3092\u304A\u9078\u3073\u304F\u3060\u3055\u3044\u3002\u7121\u6599\u30D7\u30E9\u30F3\u3042\u308A\u3001Pro\u6C38\u4E45\u7248\u306F\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u3068BYOK\u5BFE\u5FDC\u3002"
    },
    ko: {
      title: "\uC694\uAE08\uC81C - NexMap | \uAC04\uB2E8\uD558\uACE0 \uD22C\uBA85\uD55C \uAC00\uACA9",
      description: "\uACF5\uAC04 \uC0AC\uACE0 \uC694\uAD6C\uC5D0 \uB9DE\uB294 \uC644\uBCBD\uD55C \uD50C\uB79C\uC744 \uC120\uD0DD\uD558\uC138\uC694. \uBB34\uB8CC \uD2F0\uC5B4 \uC81C\uACF5, Pro \uD3C9\uC0DD \uBC84\uC804\uC740 \uBB34\uD55C \uCE94\uBC84\uC2A4\uC640 BYOK \uC9C0\uC6D0."
    }
  },
  // Gallery
  "/gallery": {
    en: {
      title: "Gallery - NexMap | Your Mind Map Workspace",
      description: "Access all your AI-powered mind maps in one place. Create, organize, and explore your spatial thinking boards."
    },
    zh: {
      title: "\u753B\u5ECA - NexMap | \u60A8\u7684\u601D\u7EF4\u5BFC\u56FE\u5DE5\u4F5C\u533A",
      description: "\u5728\u4E00\u4E2A\u5730\u65B9\u8BBF\u95EE\u6240\u6709AI\u9A71\u52A8\u7684\u601D\u7EF4\u5BFC\u56FE\u3002\u521B\u5EFA\u3001\u7EC4\u7EC7\u548C\u63A2\u7D22\u60A8\u7684\u7A7A\u95F4\u601D\u7EF4\u753B\u677F\u3002"
    },
    ja: {
      title: "\u30AE\u30E3\u30E9\u30EA\u30FC - NexMap | \u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7\u30EF\u30FC\u30AF\u30B9\u30DA\u30FC\u30B9",
      description: "\u3059\u3079\u3066\u306EAI\u642D\u8F09\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7\u3092\u4E00\u304B\u6240\u3067\u30A2\u30AF\u30BB\u30B9\u3002\u7A7A\u9593\u601D\u8003\u30DC\u30FC\u30C9\u3092\u4F5C\u6210\u3001\u6574\u7406\u3001\u63A2\u7D22\u3002"
    },
    ko: {
      title: "\uAC24\uB7EC\uB9AC - NexMap | \uB9C8\uC778\uB4DC\uB9F5 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4",
      description: "\uBAA8\uB4E0 AI \uAE30\uBC18 \uB9C8\uC778\uB4DC\uB9F5\uC744 \uD55C \uACF3\uC5D0\uC11C \uC811\uADFC\uD558\uC138\uC694. \uACF5\uAC04 \uC0AC\uACE0 \uBCF4\uB4DC\uB97C \uC0DD\uC131, \uAD6C\uC131, \uD0D0\uC0C9\uD558\uC138\uC694."
    }
  },
  // Free Trial
  "/free-trial": {
    en: {
      title: "Free Trial - NexMap | Try AI Mind Mapping Free",
      description: "Experience the power of AI-driven spatial thinking. No credit card required. Start your infinite canvas journey today."
    },
    zh: {
      title: "\u514D\u8D39\u8BD5\u7528 - NexMap | \u514D\u8D39\u4F53\u9A8CAI\u601D\u7EF4\u5BFC\u56FE",
      description: "\u4F53\u9A8CAI\u9A71\u52A8\u7684\u7A7A\u95F4\u601D\u7EF4\u7684\u529B\u91CF\u3002\u65E0\u9700\u4FE1\u7528\u5361\u3002\u4ECA\u5929\u5C31\u5F00\u59CB\u60A8\u7684\u65E0\u9650\u753B\u5E03\u4E4B\u65C5\u3002"
    },
    ja: {
      title: "\u7121\u6599\u30C8\u30E9\u30A4\u30A2\u30EB - NexMap | AI\u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7\u3092\u7121\u6599\u3067\u8A66\u3059",
      description: "AI\u99C6\u52D5\u306E\u7A7A\u9593\u601D\u8003\u306E\u529B\u3092\u4F53\u9A13\u3002\u30AF\u30EC\u30B8\u30C3\u30C8\u30AB\u30FC\u30C9\u4E0D\u8981\u3002\u4ECA\u65E5\u304B\u3089\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u306E\u65C5\u3092\u59CB\u3081\u307E\u3057\u3087\u3046\u3002"
    },
    ko: {
      title: "\uBB34\uB8CC \uCCB4\uD5D8 - NexMap | AI \uB9C8\uC778\uB4DC\uB9F5 \uBB34\uB8CC \uCCB4\uD5D8",
      description: "AI \uAE30\uBC18 \uACF5\uAC04 \uC0AC\uACE0\uC758 \uD798\uC744 \uACBD\uD5D8\uD558\uC138\uC694. \uC2E0\uC6A9\uCE74\uB4DC \uBD88\uD544\uC694. \uC624\uB298 \uBB34\uD55C \uCE94\uBC84\uC2A4 \uC5EC\uC815\uC744 \uC2DC\uC791\uD558\uC138\uC694."
    }
  },
  // Feedback
  "/feedback": {
    en: {
      title: "Feedback - NexMap | Share Your Ideas",
      description: "Help us improve NexMap. Share your feedback, vote on features, and shape the future of spatial AI thinking."
    },
    zh: {
      title: "\u53CD\u9988 - NexMap | \u5206\u4EAB\u60A8\u7684\u60F3\u6CD5",
      description: "\u5E2E\u52A9\u6211\u4EEC\u6539\u8FDBNexMap\u3002\u5206\u4EAB\u60A8\u7684\u53CD\u9988\u3001\u4E3A\u529F\u80FD\u6295\u7968\uFF0C\u5171\u540C\u5851\u9020\u7A7A\u95F4AI\u601D\u7EF4\u7684\u672A\u6765\u3002"
    },
    ja: {
      title: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF - NexMap | \u30A2\u30A4\u30C7\u30A2\u3092\u5171\u6709",
      description: "NexMap\u306E\u6539\u5584\u306B\u3054\u5354\u529B\u304F\u3060\u3055\u3044\u3002\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3092\u5171\u6709\u3057\u3001\u6A5F\u80FD\u306B\u6295\u7968\u3057\u3001\u7A7A\u9593AI\u601D\u8003\u306E\u672A\u6765\u3092\u5F62\u4F5C\u308A\u307E\u3057\u3087\u3046\u3002"
    },
    ko: {
      title: "\uD53C\uB4DC\uBC31 - NexMap | \uC544\uC774\uB514\uC5B4 \uACF5\uC720",
      description: "NexMap \uAC1C\uC120\uC5D0 \uB3C4\uC6C0\uC744 \uC8FC\uC138\uC694. \uD53C\uB4DC\uBC31\uC744 \uACF5\uC720\uD558\uACE0, \uAE30\uB2A5\uC5D0 \uD22C\uD45C\uD558\uACE0, \uACF5\uAC04 AI \uC0AC\uACE0\uC758 \uBBF8\uB798\uB97C \uB9CC\uB4E4\uC5B4\uAC00\uC138\uC694."
    }
  },
  // About
  "/about": {
    en: {
      title: "About - NexMap | Our Vision for Spatial AI",
      description: "Learn about NexMap's mission to revolutionize how you think and organize ideas with AI-powered infinite canvas technology."
    },
    zh: {
      title: "\u5173\u4E8E\u6211\u4EEC - NexMap | \u7A7A\u95F4AI\u7684\u613F\u666F",
      description: "\u4E86\u89E3NexMap\u7684\u4F7F\u547D\uFF1A\u901A\u8FC7AI\u9A71\u52A8\u7684\u65E0\u9650\u753B\u5E03\u6280\u672F\uFF0C\u9769\u65B0\u60A8\u601D\u8003\u548C\u7EC4\u7EC7\u60F3\u6CD5\u7684\u65B9\u5F0F\u3002"
    },
    ja: {
      title: "\u79C1\u305F\u3061\u306B\u3064\u3044\u3066 - NexMap | \u7A7A\u9593AI\u306E\u30D3\u30B8\u30E7\u30F3",
      description: "NexMap\u306E\u30DF\u30C3\u30B7\u30E7\u30F3\u3092\u3054\u7D39\u4ECB\u3002AI\u642D\u8F09\u306E\u7121\u9650\u30AD\u30E3\u30F3\u30D0\u30B9\u6280\u8853\u3067\u3001\u601D\u8003\u3068\u30A2\u30A4\u30C7\u30A2\u6574\u7406\u306E\u65B9\u6CD5\u3092\u9769\u65B0\u3057\u307E\u3059\u3002"
    },
    ko: {
      title: "\uC18C\uAC1C - NexMap | \uACF5\uAC04 AI \uBE44\uC804",
      description: "NexMap\uC758 \uBBF8\uC158\uC744 \uC54C\uC544\uBCF4\uC138\uC694. AI \uAE30\uBC18 \uBB34\uD55C \uCE94\uBC84\uC2A4 \uAE30\uC220\uB85C \uC0DD\uAC01\uD558\uACE0 \uC544\uC774\uB514\uC5B4\uB97C \uC815\uB9AC\uD558\uB294 \uBC29\uC2DD\uC744 \uD601\uC2E0\uD569\uB2C8\uB2E4."
    }
  },
  // History
  "/history": {
    en: {
      title: "History - NexMap | Our Journey",
      description: "Explore the development history of NexMap. See how we built the ultimate AI-powered spatial thinking tool."
    },
    zh: {
      title: "\u53D1\u5C55\u5386\u7A0B - NexMap | \u6211\u4EEC\u7684\u65C5\u7A0B",
      description: "\u63A2\u7D22NexMap\u7684\u53D1\u5C55\u5386\u7A0B\u3002\u4E86\u89E3\u6211\u4EEC\u5982\u4F55\u6784\u5EFA\u7EC8\u6781AI\u9A71\u52A8\u7684\u7A7A\u95F4\u601D\u7EF4\u5DE5\u5177\u3002"
    },
    ja: {
      title: "\u958B\u767A\u5C65\u6B74 - NexMap | \u79C1\u305F\u3061\u306E\u6B69\u307F",
      description: "NexMap\u306E\u958B\u767A\u306E\u6B74\u53F2\u3092\u63A2\u308B\u3002\u7A76\u6975\u306EAI\u642D\u8F09\u7A7A\u9593\u601D\u8003\u30C4\u30FC\u30EB\u3092\u3069\u306E\u3088\u3046\u306B\u69CB\u7BC9\u3057\u305F\u304B\u3092\u3054\u89A7\u304F\u3060\u3055\u3044\u3002"
    },
    ko: {
      title: "\uC5ED\uC0AC - NexMap | \uC6B0\uB9AC\uC758 \uC5EC\uC815",
      description: "NexMap\uC758 \uAC1C\uBC1C \uC5ED\uC0AC\uB97C \uD0D0\uD5D8\uD558\uC138\uC694. \uAD81\uADF9\uC758 AI \uAE30\uBC18 \uACF5\uAC04 \uC0AC\uACE0 \uB3C4\uAD6C\uB97C \uC5B4\uB5BB\uAC8C \uAD6C\uCD95\uD588\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    }
  }
};

// _middleware.js
function parseUrlLanguage(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && LANGUAGES.includes(parts[0])) {
    const lang = parts[0];
    const restPath = "/" + parts.slice(1).join("/") || "/";
    return { lang, path: restPath };
  }
  return { lang: "en", path: pathname };
}
__name(parseUrlLanguage, "parseUrlLanguage");
function getSeoConfig(lang, path) {
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  let pageConfig = SEO_CONFIG[normalizedPath];
  if (!pageConfig) {
    if (normalizedPath.startsWith("/board/")) {
      pageConfig = SEO_CONFIG["/gallery"];
    } else {
      pageConfig = SEO_CONFIG["/"];
    }
  }
  return pageConfig[lang] || pageConfig["en"];
}
__name(getSeoConfig, "getSeoConfig");
function generateHreflangTags(path, currentLang) {
  const tags = LANGUAGES.map((lang) => {
    const href = lang === "en" ? `${BASE_URL}${path}` : `${BASE_URL}/${lang}${path === "/" ? "" : path}`;
    const hreflang = lang === "en" ? "en" : lang === "zh" ? "zh-Hans" : lang;
    return `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
  });
  tags.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`);
  return tags.join("\n    ");
}
__name(generateHreflangTags, "generateHreflangTags");
function generateJsonLd(seoConfig, canonicalUrl, lang) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "NexMap",
    "description": seoConfig.description,
    "url": canonicalUrl,
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "inLanguage": lang
  };
  return JSON.stringify(schema);
}
__name(generateJsonLd, "generateJsonLd");
var HtmlLangHandler = class {
  static {
    __name(this, "HtmlLangHandler");
  }
  constructor(lang) {
    this.lang = lang;
  }
  element(element) {
    element.setAttribute("lang", this.lang);
  }
};
var TitleHandler = class {
  static {
    __name(this, "TitleHandler");
  }
  constructor(title) {
    this.title = title;
  }
  element(element) {
    element.setInnerContent(this.title);
  }
};
var MetaHandler = class {
  static {
    __name(this, "MetaHandler");
  }
  constructor(seoConfig, info) {
    this.seoConfig = seoConfig;
    this.info = info;
  }
  element(element) {
    const name = element.getAttribute("name");
    const property = element.getAttribute("property");
    if (name === "description") {
      element.setAttribute("content", this.seoConfig.description);
    }
    if (name === "keywords" && this.seoConfig.keywords) {
      element.setAttribute("content", this.seoConfig.keywords);
    }
    if (property === "og:title") {
      element.setAttribute("content", this.seoConfig.ogTitle || this.seoConfig.title);
    }
    if (property === "og:description") {
      element.setAttribute("content", this.seoConfig.ogDescription || this.seoConfig.description);
    }
    if (property === "og:url") {
      element.setAttribute("content", this.info.canonicalUrl);
    }
    if (property === "og:locale") {
      const localeMap = { "en": "en_US", "zh": "zh_CN", "ja": "ja_JP", "ko": "ko_KR" };
      element.setAttribute("content", localeMap[this.info.lang] || this.info.lang);
    }
    if (name === "twitter:title") {
      element.setAttribute("content", this.seoConfig.ogTitle || this.seoConfig.title);
    }
    if (name === "twitter:description") {
      element.setAttribute("content", this.seoConfig.ogDescription || this.seoConfig.description);
    }
  }
};
var CanonicalHandler = class {
  static {
    __name(this, "CanonicalHandler");
  }
  constructor(canonicalUrl) {
    this.canonicalUrl = canonicalUrl;
  }
  element(element) {
    const rel = element.getAttribute("rel");
    if (rel === "canonical") {
      element.setAttribute("href", this.canonicalUrl);
    }
  }
};
var HeadEndHandler = class {
  static {
    __name(this, "HeadEndHandler");
  }
  constructor(hreflangTags, jsonLd) {
    this.hreflangTags = hreflangTags;
    this.jsonLd = jsonLd;
  }
  element(element) {
    element.append(`
    <!-- Hreflang for multi-language SEO -->
    ${this.hreflangTags}
`, { html: true });
    if (this.jsonLd) {
      element.append(`
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${this.jsonLd}
    <\/script>
`, { html: true });
    }
  }
};
async function onRequest9(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|webp|mp4|webm)$/i)) {
    return next();
  }
  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }
  const { lang, path } = parseUrlLanguage(pathname);
  const seoConfig = getSeoConfig(lang, path);
  const canonicalUrl = lang === "en" ? `${BASE_URL}${path}` : `${BASE_URL}/${lang}${path === "/" ? "" : path}`;
  const hreflangTags = generateHreflangTags(path, lang);
  const jsonLd = generateJsonLd(seoConfig, canonicalUrl, lang);
  const rewriter = new HTMLRewriter().on("html", new HtmlLangHandler(lang)).on("title", new TitleHandler(seoConfig.title)).on("meta", new MetaHandler(seoConfig, { canonicalUrl, lang })).on('meta[name="description"]', new MetaHandler(seoConfig, { canonicalUrl, lang })).on('meta[name="keywords"]', new MetaHandler(seoConfig, { canonicalUrl, lang })).on('meta[property^="og:"]', new MetaHandler(seoConfig, { canonicalUrl, lang })).on('meta[name^="twitter:"]', new MetaHandler(seoConfig, { canonicalUrl, lang })).on('link[rel="canonical"]', new CanonicalHandler(canonicalUrl)).on("head", new HeadEndHandler(hreflangTags, jsonLd));
  return rewriter.transform(response);
}
__name(onRequest9, "onRequest");

// ../.wrangler/tmp/pages-59mbs4/functionsRoutes-0.044199513327749074.mjs
var routes = [
  {
    routePath: "/api/admin/codes",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
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
    modules: [onRequest2]
  },
  {
    routePath: "/api/gmi-serving",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/image-gen",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/image-proxy",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/redeem",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/system-credits",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  },
  {
    routePath: "/api/test",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest8]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest9],
    modules: []
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
