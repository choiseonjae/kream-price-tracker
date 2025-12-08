import { getUser } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const supabase = createServerClient();

  // Get user info with plan
  const { data: userData } = await (supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single() as any);

  // Get watchlist items
  const { data: watchItems } = await (supabase
    .from("watch_items")
    .select(`
      *,
      items:item_id (
        id,
        title,
        brand,
        image_url,
        kream_url
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as any);

  const plan = userData?.plan || "FREE";
  const watchlistCount = watchItems?.length || 0;
  const maxWatchlist = plan === "PRO" ? 50 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar userEmail={user.email} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">대시보드</h1>
              <p className="text-muted-foreground mt-1">
                워치리스트와 가격 알림을 관리하세요
              </p>
            </div>
            <Badge variant={plan === "PRO" ? "default" : "secondary"}>
              {plan} 플랜
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">워치리스트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {watchlistCount} / {maxWatchlist}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  등록된 아이템
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">플랜</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plan}</div>
                {plan === "FREE" && (
                  <Button variant="link" className="px-0 h-auto mt-1 text-xs">
                    PRO로 업그레이드 →
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">활성 알림</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  설정된 알림
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Watchlist */}
          <Card>
            <CardHeader>
              <CardTitle>워치리스트</CardTitle>
              <CardDescription>
                가격 추적 중인 아이템 목록
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchItems && watchItems.length > 0 ? (
                <div className="space-y-4">
                  {watchItems.map((watchItem: any) => {
                    const item = watchItem.items;
                    return (
                      <div
                        key={watchItem.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.brand}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.kream_url, "_blank")}
                          >
                            KREAM에서 보기
                          </Button>
                          <form action="/api/watchlist" method="POST">
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="action" value="remove" />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    아직 워치리스트에 아이템이 없습니다
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => (window.location.href = "/")}
                  >
                    아이템 추가하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
