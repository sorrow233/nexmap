import { onRequestPost as __api_create_checkout_js_onRequestPost } from "/Users/kang/Documents/AICode/aimainmap/functions/api/create-checkout.js"
import { onRequestPost as __api_webhook_js_onRequestPost } from "/Users/kang/Documents/AICode/aimainmap/functions/api/webhook.js"
import { onRequest as __api_feedback_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/feedback.js"
import { onRequest as __api_gmi_serving_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/gmi-serving.js"
import { onRequest as __api_image_gen_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-gen.js"
import { onRequest as __api_image_proxy_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-proxy.js"
import { onRequest as __api_system_credits_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/system-credits.js"
import { onRequest as __api_test_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/test.js"

export const routes = [
    {
      routePath: "/api/create-checkout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_checkout_js_onRequestPost],
    },
  {
      routePath: "/api/webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_webhook_js_onRequestPost],
    },
  {
      routePath: "/api/feedback",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_feedback_js_onRequest],
    },
  {
      routePath: "/api/gmi-serving",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_gmi_serving_js_onRequest],
    },
  {
      routePath: "/api/image-gen",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_image_gen_js_onRequest],
    },
  {
      routePath: "/api/image-proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_image_proxy_js_onRequest],
    },
  {
      routePath: "/api/system-credits",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_system_credits_js_onRequest],
    },
  {
      routePath: "/api/test",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_test_js_onRequest],
    },
  ]