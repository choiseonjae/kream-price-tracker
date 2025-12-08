import { getUser } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AlertsSettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login?redirect=/settings/alerts");
  }

  const supabase = createServerClient();

  // Get alerts
  const { data: alerts } = await (supabase
    .from("price_alerts")
    .select(`
      *,
      items:item_id (
        id,
        title,
        brand,
        image_url
      ),
      watch_items!inner (
        id
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as any);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar userEmail={user.email} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">가격 알림 설정</h1>
            <p className="text-muted-foreground mt-1">
              워치리스트 아이템의 가격 알림을 설정하세요
            </p>
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    가격 알림이 작동하는 방법
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    워치리스트의 아이템 가격이 설정한 조건을 만족하면 이메일로 알림을 보내드립니다.
                    알림은 1-4시간마다 체크됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          {alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: any) => {
                const item = alert.items;
                const isActive = alert.is_active;
                const direction = alert.direction;
                const threshold = alert.threshold_percent;

                return (
                  <Card key={alert.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <CardDescription>{item.brand}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "활성" : "비활성"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">알림 조건</p>
                          <p className="text-sm">
                            {direction === "KR_MORE_EXPENSIVE"
                              ? `한국이 일본보다 ${threshold}% 이상 비싸면 알림`
                              : `일본이 한국보다 ${threshold}% 이상 비싸면 알림`}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            조건 수정
                          </Button>
                          <form action="/api/alerts" method="DELETE">
                            <input type="hidden" name="id" value={alert.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                            >
                              {isActive ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                              {isActive ? "비활성화" : "활성화"}
                            </Button>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  아직 설정된 알림이 없습니다
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  워치리스트로 이동
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
