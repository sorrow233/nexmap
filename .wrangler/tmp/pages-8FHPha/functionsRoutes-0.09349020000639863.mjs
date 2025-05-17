import { onRequest as __api_gmi_proxy_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/gmi-proxy.js"
import { onRequest as __api_image_gen_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-gen.js"
import { onRequest as __api_image_proxy_js_onRequest } from "/Users/kang/Documents/AICode/aimainmap/functions/api/image-proxy.js"

export const routes = [
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
  ]