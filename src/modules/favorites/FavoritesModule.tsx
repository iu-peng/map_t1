import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function FavoritesModule() {
  return (
    <Card className="h-full border-dashed bg-white/80">
      <CardHeader>
        <CardTitle>收藏地点</CardTitle>
        <CardDescription>模块 4 占位，后续可保存常用地址、路线和地图样式配置。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">模块 4</div>
      </CardContent>
    </Card>
  );
}
