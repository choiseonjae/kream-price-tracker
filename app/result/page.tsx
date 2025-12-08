"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, formatPriceDifference } from "@/lib/utils/price-comparison";
import { createAuthClient } from "@/lib/supabase/auth-client";

interface ItemData {
  item: {
    id: string;
    title: string;
    brand: string;
    image_url: string | null;
    kream_url: string;
  };
  comparison: {
    kreamPriceKr: number;
    jpPriceJp: number;
    jpPriceKr: number;
    diff: number;
    diffPercent: number;
    exchangeRate: number;
  } | null;
  priceHistory: Array<{
    id: string;
    price: number;
    currency: string;
    source: string;
    captured_at: string;
  }>;
}

function ResultPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const itemId = searchParams.get("itemId");

  const [data, setData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setError("상품 ID가 없습니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/item/${itemId}`);

        if (!response.ok) {
          throw new Error("상품 정보를 불러올 수 없습니다.");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId]);

  useEffect(() => {
    const supabase = createAuthClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleAddToWatchlist = async () => {
    if (!user) {
      router.push(`/login?redirect=/result?itemId=${itemId}`);
      return;
    }

    if (!data) return;

    setAddingToWatchlist(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: data.item.id,
          action: "add",
          jpReferencePrice: data.comparison?.jpPriceJp || null,
          currency: "JPY",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "워치리스트 추가에 실패했습니다.");
      }

      alert("워치리스트에 추가되었습니다!");
      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "워치리스트 추가에 실패했습니다.");
    } finally {
      setAddingToWatchlist(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">로딩 중...</div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <p className="text-red-600">{error || "데이터를 찾을 수 없습니다."}</p>
                <Button onClick={() => router.push("/")} className="mt-4">
                  홈으로 돌아가기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const { item, comparison } = data;
  const isKoreaMoreExpensive = comparison && comparison.diff > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            새로운 분석
          </Button>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-md"
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <CardDescription className="text-lg mt-1">{item.brand}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Price Comparison */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle>가격 비교</CardTitle>
                <CardDescription>최신 가격 정보를 기반으로 비교합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prices */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">한국 (KREAM)</p>
                    <p className="text-2xl font-bold">{formatPrice(comparison.kreamPriceKr, 'KRW')}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">일본</p>
                    <p className="text-2xl font-bold">{formatPrice(comparison.jpPriceKr, 'KRW')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPrice(comparison.jpPriceJp, 'JPY')} (₩{comparison.exchangeRate}/¥)
                    </p>
                  </div>
                </div>

                {/* Difference */}
                <div className={`p-6 rounded-lg ${
                  isKoreaMoreExpensive
                    ? 'bg-red-50 dark:bg-red-950'
                    : 'bg-green-50 dark:bg-green-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">가격 차이</p>
                      <p className="text-3xl font-bold">
                        {formatPriceDifference(comparison.diff, comparison.diffPercent)}
                      </p>
                    </div>
                    {isKoreaMoreExpensive ? (
                      <TrendingUp className="h-12 w-12 text-red-600" />
                    ) : (
                      <TrendingDown className="h-12 w-12 text-green-600" />
                    )}
                  </div>
                  <p className="mt-4 text-sm">
                    {isKoreaMoreExpensive ? (
                      <span className="text-red-700 dark:text-red-400">
                        한국이 일본보다 <strong>{Math.abs(comparison.diffPercent)}%</strong> 비쌉니다.
                        일본에서 구매하면 약 <strong>{formatPrice(Math.abs(comparison.diff), 'KRW')}</strong> 절약할 수 있습니다.
                      </span>
                    ) : (
                      <span className="text-green-700 dark:text-green-400">
                        일본이 한국보다 <strong>{Math.abs(comparison.diffPercent)}%</strong> 비쌉니다.
                        한국에서 구매하는 것이 유리합니다!
                      </span>
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <a href={item.kream_url} target="_blank" rel="noopener noreferrer">
                      KREAM에서 보기
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleAddToWatchlist}
                    disabled={addingToWatchlist}
                  >
                    {addingToWatchlist
                      ? "추가 중..."
                      : user
                      ? "워치리스트 추가"
                      : "워치리스트 추가 (로그인 필요)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price History */}
          <Card>
            <CardHeader>
              <CardTitle>가격 히스토리</CardTitle>
              <CardDescription>최근 30개의 가격 기록</CardDescription>
            </CardHeader>
            <CardContent>
              {data.priceHistory.length > 0 ? (
                <div className="space-y-2">
                  {data.priceHistory.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-md"
                    >
                      <div>
                        <p className="font-medium">
                          {formatPrice(snapshot.price, snapshot.currency as 'KRW' | 'JPY')}
                        </p>
                        <p className="text-xs text-muted-foreground">{snapshot.source}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(snapshot.captured_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">가격 기록이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">로딩 중...</div>
          </div>
        </div>
      </main>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
