var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/gmi-proxy.js
async function onRequest(context) {
  const { request } = context;
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
__name(onRequest, "onRequest");

// api/image-gen.js
async function onRequest2(context) {
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
__name(onRequest2, "onRequest");

// api/image-proxy.js
async function onRequest3(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (!imageUrl.startsWith("https://storage.googleapis.com/gmi-video-assests-prod/")) {
      return new Response(JSON.stringify({ error: "Invalid image URL" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
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
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const contentType = response.headers.get("Content-Type") || "image/png";
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
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
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(onRequest3, "onRequest");

// api/system-credits.js
var SYSTEM_MODEL = "gemini-3-flash-preview";
var SYSTEM_BASE_URL = "https://api.gmi-serving.com/v1";
var PRICING = {
  INPUT_PER_MILLION: 0.4,
  // $0.40/M = 0.40 credits/M
  OUTPUT_PER_MILLION: 2.4
  // $2.40/M = 2.40 credits/M
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
async function onRequest4(context) {
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
    const endpoint = stream ? `/models/${SYSTEM_MODEL}:streamGenerateContent` : `/models/${SYSTEM_MODEL}:generateContent`;
    const url = `${SYSTEM_BASE_URL}${endpoint}`;
    console.log(`[SystemCredits] User ${userId} (${userData.credits.toFixed(2)} credits) -> ${url}`);
    const upstreamResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${systemApiKey}`
      },
      body: JSON.stringify(requestBody)
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
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
            const text = new TextDecoder().decode(value);
            const usageMatch = text.match(/"usageMetadata":\s*{[^}]*"promptTokenCount":\s*(\d+)[^}]*"candidatesTokenCount":\s*(\d+)/);
            if (usageMatch) {
              totalInputTokens = parseInt(usageMatch[1]);
              totalOutputTokens = parseInt(usageMatch[2]);
            }
          }
        } finally {
          writer.close();
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
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
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
__name(onRequest4, "onRequest");

// ../.wrangler/tmp/pages-xNIlgm/functionsRoutes-0.7487744071006259.mjs
var routes = [
  {
    routePath: "/api/gmi-proxy",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/image-gen",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/image-proxy",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/system-credits",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest4]
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
