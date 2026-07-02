# 高德地图路线导航

一个兼容 Web 和 H5 的高德地图路线规划页面。

## 功能

- Web 端：地图右侧悬浮路线规划面板。
- H5 端：右下角「路线」按钮唤起右侧抽屉。
- 支持驾车、骑行、步行三种路线规划。
- 支持输入地点关键词或 `lng,lat` 坐标。
- 规划后自动在地图上绘制路线，并在面板中展示路线详情、预计距离、预计用时。

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开：

```text
http://localhost:5173
```

## 环境变量

以 Vite 为例，在项目根目录创建 `.env.local`：

```bash
VITE_AMAP_JS_API_KEY=你的高德Web端JSAPI Key
VITE_AMAP_SECURITY_JS_CODE=你的高德JSAPI安全密钥
VITE_AMAP_SERVICE_HOST=
VITE_AMAP_DEFAULT_CITY=全国
```

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_AMAP_JS_API_KEY` | 是 | 高德开放平台中申请的「Web端(JS API)」Key。 |
| `VITE_AMAP_SECURITY_JS_CODE` | 开发环境建议填 | 高德 JSAPI 安全密钥。2021-12-02 后申请的 JSAPI Key 需要配合安全密钥使用。 |
| `VITE_AMAP_SERVICE_HOST` | 生产环境推荐 | 安全密钥代理服务地址，例如 `https://your-domain.com/_AMapService`。配置后优先使用该值。 |
| `VITE_AMAP_DEFAULT_CITY` | 否 | POI 搜索默认城市，默认 `全国`。如果业务只在某个城市使用，可以填 `北京`、`上海` 等。 |

## 高德开放平台需要申请什么

1. 注册并登录高德开放平台。
2. 创建应用。
3. 添加 Key 时选择「Web端(JS API)」。
4. 保存 Key 和安全密钥。
5. 在高德控制台配置允许访问的域名白名单，本地开发通常需要加入 `localhost` 或你的本地域名，线上加入正式域名。

## 安全注意项

- `VITE_AMAP_JS_API_KEY` 和 `VITE_AMAP_SECURITY_JS_CODE` 会被前端打包暴露，生产环境更推荐使用 `VITE_AMAP_SERVICE_HOST` 对安全密钥做服务端代理。
- 高德官方要求 JS API 在线加载，不要把 JSAPI 文件下载到本地后再打包。
- 组件卸载时已经调用 `map.destroy()`，避免单页应用路由切换后地图实例泄漏。

## 发布到 Vercel

构建配置：

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

在 Vercel 项目环境变量中配置：

```bash
VITE_AMAP_JS_API_KEY=你的高德Web端JSAPI Key
VITE_AMAP_SECURITY_JS_CODE=你的高德JSAPI安全密钥
VITE_AMAP_SERVICE_HOST=
VITE_AMAP_DEFAULT_CITY=全国
```

## 发布到 Cloudflare Pages

构建配置：

```text
Framework preset: React / Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

环境变量同 Vercel。

## 常见问题

### 地图加载失败

检查：

- `VITE_AMAP_JS_API_KEY` 是否为空。
- Key 类型是否是「Web端(JS API)」，不要误用「Web服务 API」Key。
- 新申请的 Key 是否配置了安全密钥或代理 `serviceHost`。
- 高德控制台域名白名单是否包含当前访问域名。

### 可以做真正的实时语音导航吗

这个页面实现的是 Web/H5 路线规划和路线绘制，不是高德 App 那种实时语音导航。H5 若要拉起高德 App 导航，可以在规划完成后追加高德 URI Scheme 或网页版导航跳转能力。
