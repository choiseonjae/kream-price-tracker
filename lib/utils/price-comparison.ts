export interface PriceComparisonResult {
  kreamPriceKr: number;
  jpPriceJp: number;
  jpPriceKr: number;
  diff: number;
  diffPercent: number;
  exchangeRate: number;
}

export function calculatePriceComparison(
  kreamPriceKr: number,
  jpPriceJp: number,
  exchangeRate: number
): PriceComparisonResult {
  const jpPriceKr = Math.round(jpPriceJp * exchangeRate);
  const diff = kreamPriceKr - jpPriceKr;
  const diffPercent = Math.round((diff / jpPriceKr) * 100 * 10) / 10;

  return {
    kreamPriceKr,
    jpPriceJp,
    jpPriceKr,
    diff,
    diffPercent,
    exchangeRate,
  };
}

export function formatPrice(price: number, currency: 'KRW' | 'JPY'): string {
  if (currency === 'KRW') {
    return `₩${price.toLocaleString('ko-KR')}`;
  }
  return `¥${price.toLocaleString('ja-JP')}`;
}

export function formatPriceDifference(diff: number, diffPercent: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}₩${diff.toLocaleString('ko-KR')} (${sign}${diffPercent}%)`;
}

// Mock exchange rate - in production, this should fetch from an API
export async function getExchangeRate(): Promise<number> {
  // TODO: Implement actual exchange rate API call
  // For now, return a mock exchange rate (JPY to KRW)
  return 9.5; // 1 JPY = 9.5 KRW (example rate)
}
