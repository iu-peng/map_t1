/**
 * 高德地图 JSAPI 未提供官方 TS 类型，这里用别名收敛所有 `any`，
 * 便于后续需要时集中替换成更精确的类型，也让业务代码语义更清晰。
 */
export type AMapNamespace = any;
export type AMapInstance = any;
export type AMapMap = any;

/** 经纬度：[经度, 纬度] */
export type LngLat = [number, number];

/** 出行方式 */
export type TravelMode = 'driving' | 'transit' | 'riding' | 'walking';

/** 路线绘制效果 */
export type RouteEffect = 'default' | 'traffic' | 'simple';
