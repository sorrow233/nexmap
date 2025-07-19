import { onRequest as __api_feedback_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/feedback.js"
import { onRequest as __api_gmi_proxy_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/gmi-proxy.js"
import { onRequest as __api_image_gen_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-gen.js"
import { onRequest as __api_image_proxy_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-proxy.js"
import { onRequest as __api_system_credits_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/system-credits.js"

export const routes = [
    {
      routePath: "/api/feedback",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_feedback_js_onRequest],
    },
  {
      routePath: "/api/gmi-proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_gmi_proxy_js_onRequest],
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
  ]