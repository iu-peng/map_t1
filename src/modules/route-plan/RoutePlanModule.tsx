import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RoutePlanModule() {
  return (
    <Card className="h-full border-dashed bg-white/80">
      <CardHeader>
        <CardTitle>路线规划</CardTitle>
        <CardDescription>模块 2 占位，后续可接入多点路线、收藏路线、路线对比等能力。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">模块 2</div>
      </CardContent>
    </Card>
  );
}
