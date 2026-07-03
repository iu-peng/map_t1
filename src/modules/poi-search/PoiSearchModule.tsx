import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PoiSearchModule() {
  return (
    <Card className="h-full border-dashed bg-white/80">
      <CardHeader>
        <CardTitle>地点搜索</CardTitle>
        <CardDescription>模块 3 占位，后续可接入 POI 搜索、附近服务、分类筛选。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">模块 3</div>
      </CardContent>
    </Card>
  );
}
