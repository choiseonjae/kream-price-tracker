# KREAM Price Tracker

KREAM에 등록된 리셀 아이템의 한국 가격(KRW)과 일본 가격(JPY 또는 KRW 환산)을 비교하여 최적의 구매 결정을 내릴 수 있도록 돕는 웹 서비스입니다.

## 기능

- ✅ KREAM 상품 URL 분석
- ✅ 한국-일본 가격 비교
- ✅ 가격 히스토리 추적
- ✅ 사용자 인증 (Supabase Auth)
- ✅ 워치리스트 기능
- ✅ 가격 알림 시스템
- ✅ Vercel Cron으로 자동 가격 업데이트
- ✅ 이메일 알림 (Resend)
- ✅ 수익화 (Polar - FREE/PRO 플랜)

## 기술 스택

- **Frontend & Backend**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Email**: Resend
- **Monetization**: Polar

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Supabase 계정

### 설치

1. 저장소 클론 또는 다운로드

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정:
```bash
cp .env.example .env
```

`.env` 파일을 열어 다음 값을 설정하세요:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Supabase 데이터베이스 설정:
   - Supabase 프로젝트를 생성합니다
   - SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 파일의 내용을 실행합니다

5. 개발 서버 실행:
```bash
npm run dev
```

6. 브라우저에서 `http://localhost:3000` 접속

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 타입 체크
npm run type-check

# 린팅
npm run lint
```

## 프로젝트 구조

```
.
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── analyze-kream/  # KREAM 분석 엔드포인트
│   │   └── item/           # 아이템 조회 엔드포인트
│   ├── result/             # 결과 페이지
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 페이지
├── components/              # React 컴포넌트
│   └── ui/                 # shadcn/ui 컴포넌트
├── lib/                     # 유틸리티 및 헬퍼
│   ├── crawler/            # 크롤링 로직
│   ├── supabase/           # Supabase 클라이언트
│   └── utils/              # 유틸리티 함수
├── supabase/               # Supabase 설정
│   └── migrations/         # DB 마이그레이션
└── public/                 # 정적 파일
```

## 데이터베이스 스키마

주요 테이블:
- `users`: 사용자 정보
- `items`: 상품 정보
- `price_snapshots`: 가격 스냅샷 (히스토리)
- `watch_items`: 워치리스트
- `price_alerts`: 가격 알림 설정

자세한 스키마는 `supabase/migrations/001_initial_schema.sql`을 참조하세요.

## API 엔드포인트

### POST /api/analyze-kream
KREAM 상품 URL을 분석합니다.

**요청:**
```json
{
  "url": "https://kream.co.kr/products/XXXX"
}
```

**응답:**
```json
{
  "itemId": "uuid",
  "kreamPriceKr": 350000,
  "jpPriceJp": 19800,
  "jpPriceKr": 210000,
  "diff": 140000,
  "diffPercent": 66.7,
  "exchangeRate": 9.5,
  "history": [...]
}
```

### GET /api/item/[id]
특정 아이템의 상세 정보와 가격 히스토리를 조회합니다.

## 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

### 빠른 시작 (Vercel 배포)

1. GitHub에 프로젝트를 푸시합니다
2. [Vercel](https://vercel.com)에서 프로젝트를 import합니다
3. 환경 변수를 설정합니다
4. Deploy 클릭!

**배포 방법:**
- ⭐ **Vercel** (권장) - 가장 간단하고 빠름
- 🐳 **Docker** - 자체 서버 배포
- 🔧 **PM2** - Node.js 서버 배포

자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참조

## 개발 로드맵

- [x] Phase 0: 프로젝트 세팅
- [x] Phase 1: 핵심 MVP (URL 분석 + 가격 비교)
- [x] Phase 2: 인증 + 워치리스트
- [x] Phase 3: Cron + 이메일 알림
- [x] Phase 4: 수익화 (FREE/PRO 플랜)

### Phase 2 완료 사항
- Supabase Auth 통합 (매직 링크 로그인)
- 로그인/로그아웃 기능
- 워치리스트 추가/삭제 API
- 대시보드 페이지
- 플랜별 워치리스트 제한 (FREE: 3개, PRO: 50개)

### Phase 3 완료 사항
- Vercel Cron을 통한 4시간마다 가격 자동 업데이트
- 가격 알림 시스템
- Resend를 통한 이메일 알림
- 알림 설정 페이지

### Phase 4 완료 사항
- Polar webhook 통합
- FREE/PRO 플랜 구분
- 플랜별 기능 제한

## 주의사항

- 현재 MVP 버전으로, 일본 가격은 모의 데이터를 사용합니다
- KREAM 크롤링은 HTML 구조 변경에 따라 업데이트가 필요할 수 있습니다
- 환율은 고정값을 사용하고 있으며, 실제 환율 API 연동이 필요합니다

## 라이선스

MIT

## 기여

이슈 및 풀 리퀘스트를 환영합니다!
