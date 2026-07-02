declare module '@amap/amap-jsapi-loader' {
  const AMapLoader: {
    load(options: {
      key: string;
      version?: string;
      plugins?: string[];
    }): Promise<any>;
  };

  export default AMapLoader;
}
