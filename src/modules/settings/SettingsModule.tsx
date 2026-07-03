import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsModule() {
  return (
    <Card className="h-full border-dashed bg-white/80">
      <CardHeader>
        <CardTitle>应用设置</CardTitle>
        <CardDescription>模块 5 占位，后续可管理默认城市、主题、样式和偏好。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">模块 5</div>
      </CardContent>
    </Card>
  );
}
