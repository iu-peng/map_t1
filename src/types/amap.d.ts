export {};

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string;
      serviceHost?: string;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_AMAP_JS_API_KEY?: string;
    readonly VITE_AMAP_SECURITY_JS_CODE?: string;
    readonly VITE_AMAP_SERVICE_HOST?: string;
    readonly VITE_AMAP_DEFAULT_CITY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
