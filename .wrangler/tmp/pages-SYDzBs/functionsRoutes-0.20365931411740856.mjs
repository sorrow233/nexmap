import { onRequest as __api_admin_codes_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/admin/codes.js"
import { onRequestPost as __api_create_checkout_js_onRequestPost } from "/Users/kang/Documents/aimainmap/functions/api/create-checkout.js"
import { onRequestGet as __api_order_details_js_onRequestGet } from "/Users/kang/Documents/aimainmap/functions/api/order-details.js"
import { onRequestPost as __api_webhook_js_onRequestPost } from "/Users/kang/Documents/aimainmap/functions/api/webhook.js"
import { onRequest as __api_feedback_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/feedback.js"
import { onRequest as __api_gmi_serving_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/gmi-serving.js"
import { onRequest as __api_image_gen_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/image-gen.js"
import { onRequest as __api_image_proxy_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/image-proxy.js"
import { onRequest as __api_redeem_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/redeem.js"
import { onRequest as __api_system_credits_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/system-credits.js"
import { onRequest as __api_test_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/api/test.js"
import { onRequest as ___middleware_js_onRequest } from "/Users/kang/Documents/aimainmap/functions/_middleware.js"

export const routes = [
    {
      routePath: "/api/admin/codes",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_codes_js_onRequest],
    },
  {
      routePath: "/api/create-checkout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_checkout_js_onRequestPost],
    },
  {
      routePath: "/api/order-details",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_order_details_js_onRequestGet],
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
      routePath: "/api/redeem",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_redeem_js_onRequest],
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
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]