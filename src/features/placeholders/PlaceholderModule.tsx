import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PlaceholderModuleProps = {
  title: string;
  description: string;
  /** 占位内容里的角标文案，如「模块 2」。 */
  badge: string;
};

/** 尚未实现的功能模块的统一占位视图。 */
export function PlaceholderModule({ title, description, badge }: PlaceholderModuleProps) {
  return (
    <Card className="h-full border-dashed bg-white/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid h-64 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">{badge}</div>
      </CardContent>
    </Card>
  );
}
