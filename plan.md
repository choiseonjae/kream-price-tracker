````md
# 기술 명세서: KREAM – 일본 가격 비교 웹 서비스

## 1. 서비스 개요

### 1.1 목적

- KREAM에 등록된 리셀 아이템의 **한국 가격(KRW)**과 **일본 가격(JPY 또는 KRW 환산)**을 비교하여  
  사용자에게 “어디에서 사는 것이 더 유리한지”를 보여주는 웹 서비스.
- 1차 목표:
  - 사용자가 **KREAM 상품 URL**을 입력하면,
  - 백엔드에서 해당 URL 페이지를 크롤링하여 가격/상품 정보를 수집하고,
  - 일본 기준 가격과 비교하여 가격 차이 및 프리미엄(%)을 계산해 제공한다.

---

## 2. 전체 아키텍처

### 2.1 구성

- **Frontend & Backend**: Next.js (App Router) on Vercel
- **UI**: shadcn/ui (React + Tailwind 기반 UI 컴포넌트)
- **DB & Auth & Storage**: Supabase (PostgreSQL BaaS)
- **Background Job / Cron**: Vercel Cron + 서버리스 함수
- **Email**: Resend (트랜잭션/알림 이메일)
- **문서/가이드**: Mintlify (Docs 사이트)
- **수익화/후원**: Polar (후원/유료 플랜 결제)

---

## 3. 주요 기능 정의

### 3.1 사용자 플로우

1. 사용자는 랜딩 페이지 접속
2. KREAM 상품 URL 입력
3. 서버에서 해당 URL을 크롤링
4. 상품 정보 / 가격 정보 파싱 후 Supabase에 저장
5. 일본 기준 가격(JPY 혹은 KRW 환산) 계산
6. 가격 비교 결과(차액, 퍼센트)를 UI로 표시
7. (선택) 로그인 후 워치리스트에 아이템 저장
8. (선택) 가격 차이가 특정 조건을 만족하면 이메일 알림 발송

---

### 3.2 기능 리스트

#### 3.2.1 비로그인 사용자

- KREAM 상품 URL 기반 단발성 분석:
  - URL 입력 폼
  - 결과 화면: 가격 비교, 차이 %, 기본 히스토리 일부

#### 3.2.2 로그인 사용자

- Supabase Auth 기반 이메일 로그인
- 워치리스트 기능:
  - 관심 아이템 저장/삭제
  - 저장된 아이템 목록 조회
- 가격 차이 알림 설정:
  - “한국(KREAM)이 일본보다 N% 이상 비싸면 알림”
  - 또는 “일본이 한국보다 N% 이상 비싸면 알림”

#### 3.2.3 관리자 / 내부용

- 간단 Admin 페이지(후순위):
  - 전체 아이템 리스트
  - 크롤링 실패 로그
  - 일본 정가/기준 가격 테이블 관리

---

## 4. 기술 스택 상세

### 4.1 Frontend: Next.js + shadcn/ui

- **Next.js**
  - App Router (`app/` 디렉토리)
  - React Server Components
  - API Route: `app/api/.../route.ts`
- **shadcn/ui**
  - 컴포넌트: Button, Input, Card, Table, Tabs, Dialog, Toast 등
  - Form: `react-hook-form` + `zod` 조합으로 입력/검증

#### 주요 페이지 (예시)

- `/`
  - 랜딩 페이지 + KREAM URL 입력 폼
- `/result?itemId=...`
  - 단일 아이템 가격 비교 결과 화면
- `/login`
  - 이메일 로그인 / 온보딩
- `/dashboard`
  - 로그인 사용자 워치리스트 및 가격 히스토리
- `/settings/alerts`
  - 가격 알림 조건 설정 화면

---

### 4.2 Backend: Next.js API Routes + Supabase

#### 4.2.1 API 엔드포인트 (예시 설계)

1. `POST /api/analyze-kream`

   - 요청 Body:
     ```json
     {
       "url": "https://kream.co.kr/products/XXXX"
     }
     ```

   - 처리 Flow:
     1. URL 형식 및 도메인 검증
     2. Supabase에서 해당 URL을 가진 `items` 레코드 검색
     3. Vercel 서버 환경에서 `fetch`로 KREAM 페이지 HTML 요청
     4. HTML 파싱:
        - 상품명, 브랜드, 모델 코드(가능한 경우), 이미지 URL
        - 최근 거래가, 판매 최저가 등 가격 정보
     5. Supabase에 `items`, `price_snapshots` Upsert/Insert
     6. 일본 가격 조회/계산 (내부 함수 혹은 별도 API 호출)
     7. 응답:
        ```json
        {
          "itemId": "uuid",
          "kreamPriceKr": 350000,
          "jpPriceJp": 19800,
          "jpPriceKr": 210000,
          "diff": 140000,
          "diffPercent": 66.7,
          "history": [ ... ]
        }
        ```

2. `GET /api/item/[id]`

   - 단일 아이템 상세 및 가격 히스토리 조회
   - 응답: `item` 정보 + `price_snapshots` 리스트

3. `POST /api/watchlist`

   - 워치리스트 아이템 추가/삭제
   - 요청 Body:
     ```json
     {
       "itemId": "uuid",
       "action": "add" | "remove",
       "jpReferencePrice": 19800,
       "currency": "JPY"
     }
     ```

4. `POST /api/alerts`

   - 가격 알림 조건 설정/수정
   - 요청 Body:
     ```json
     {
       "itemId": "uuid",
       "direction": "KR_MORE_EXPENSIVE" | "JP_MORE_EXPENSIVE",
       "thresholdPercent": 15,
       "isActive": true
     }
     ```

5. `POST /api/cron/refresh-prices`

   - Vercel Cron에 의해 주기적으로 호출
   - 기능:
     - 워치리스트에 등록된 아이템 목록 조회
     - 각 아이템에 대해 최신 KREAM 가격 재크롤링
     - 일본 가격도 갱신(필요시)
     - 가격 비교 후, 조건 만족하는 `price_alerts`에 대해 Resend로 이메일 발송

---

### 4.3 Supabase 스키마 설계 (초안)

#### 4.3.1 테이블: `users`

```sql
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamptz default now()
);
````

#### 4.3.2 테이블: `items`

```sql
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  kream_url text unique not null,
  title text,
  brand text,
  model_code text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### 4.3.3 테이블: `price_snapshots`

```sql
create type price_source as enum ('KREAM', 'JP_RETAIL', 'JP_RESALE');

create table public.price_snapshots (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  source price_source not null,
  price numeric not null,
  currency text not null, -- 'KRW', 'JPY'
  captured_at timestamptz not null default now()
);

create index idx_price_snapshots_item_source_captured
  on public.price_snapshots (item_id, source, captured_at desc);
```

#### 4.3.4 테이블: `watch_items`

```sql
create table public.watch_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  jp_reference_price numeric, -- 일본 기준 가격 (수동/자동)
  currency text default 'JPY',
  created_at timestamptz default now(),
  unique (user_id, item_id)
);
```

#### 4.3.5 테이블: `price_alerts`

```sql
create type alert_direction as enum ('KR_MORE_EXPENSIVE', 'JP_MORE_EXPENSIVE');

create table public.price_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  direction alert_direction not null,
  threshold_percent numeric not null, -- 예: 15
  is_active boolean default true,
  created_at timestamptz default now()
);
```

---

### 4.4 크롤링 로직

#### 4.4.1 KREAM 크롤러

* 방식:

  * Next.js 서버 환경(Edge 또는 Node)에서 `fetch` 사용
  * 필요 시 `User-Agent`, `Accept-Language` 헤더 설정
* 처리:

  1. HTML 응답 수신
  2. DOM 파서(예: `cheerio` 등)로 파싱
  3. Selector 기반으로 다음 정보 추출:

     * 상품명, 브랜드, 모델 코드
     * 이미지 URL
     * 최근 거래가, 판매 최저가 등 가격 요소
  4. 숫자/통화 포맷 정제
* 예외:

  * HTML 구조 변경 시 파싱 실패 → 에러 로깅 + 사용자에게 “현재 해당 상품 분석이 어렵습니다” 메시지
  * 응답 코드 429/5xx 등: 재시도 정책 혹은 일정 시간 후 재시도

#### 4.4.2 일본 가격 데이터

* MVP 1:

  * 일본 정가/기준 가격은 내부 테이블 또는 사용자 입력값 사용
* MVP 2:

  * 브랜드별 공식 일본 웹사이트를 수동/스크립트로 크롤링해 정가 테이블 업데이트
* 환율:

  * 외부 환율 API를 통해 JPY→KRW 환율을 주기적으로 가져와 캐싱 테이블/메모리 저장

---

### 4.5 가격 비교 로직

* 정의:

  * `last_kream_price_krw` = 가장 최근 `price_snapshots` 중 source='KREAM', currency='KRW'
  * `jp_price_jpy` = 일본 기준 가격
  * `exchange_rate` = JPY → KRW 환율

* 계산:

```text
jp_price_krw = jp_price_jpy * exchange_rate

diff = last_kream_price_krw - jp_price_krw

diff_percent = (diff / jp_price_krw) * 100
```

* UI 표현 예:

  * “한국(KREAM)이 일본보다 **+X% 비쌉니다**”
  * “일본에서 사면 약 **Y원** 절약됩니다”

---

## 5. 인프라 & DevOps

### 5.1 Vercel

* Next.js 앱 및 API Routes 배포
* 환경 변수:

  * `NEXT_PUBLIC_SUPABASE_URL`
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  * `SUPABASE_SERVICE_ROLE_KEY`
  * `RESEND_API_KEY`
  * `POLAR_API_KEY`
  * `EXCHANGE_RATE_API_KEY` (사용 시)
* Vercel Cron:

  * `/api/cron/refresh-prices` 엔드포인트를 1~4시간 간격으로 호출하여 가격 갱신 및 알림 처리

### 5.2 Supabase

* 프로젝트 생성 후:

  * 위 SQL 실행하여 테이블/타입 생성
  * RLS(Row Level Security) 설정:

    * `watch_items`, `price_alerts`는 `user_id = auth.uid()` 조건으로 제한
* 서비스 롤 키는 서버 사이드에서만 사용 (API Route 내 env)

### 5.3 Resend

* 기능:

  * 회원가입/로그인 관련 트랜잭션 메일(선택)
  * 가격 알림 메일
* 구현:

  * 서버 사이드에서 Resend SDK/HTTP API 사용
  * 템플릿(HTML 이메일) 구성

### 5.4 Polar

* 유료 플랜/후원:

  * 예: FREE vs PRO
* 구현:

  * 프론트에서 Polar Checkout 또는 위젯 연동
  * 결제 완료 후 Webhook 통해 Supabase `users` 테이블의 `plan` 필드 업데이트

    * 예: `plan text default 'FREE'`
* 플랜별 제한:

  * FREE: 워치리스트 최대 3개, 알림 제한
  * PRO: 워치리스트 50개, 더 잦은 가격 갱신, 장기 히스토리 조회 등

### 5.5 Mintlify

* 별도 문서 사이트 구성:

  * 서비스 소개
  * 사용 방법 / FAQ
  * 가격 정책 / 유료 플랜 안내
  * 크롤링/법적 관련 유의사항 명시
* 메인 서비스와 분리된 서브도메인 사용 (예: `docs.example.com`)

---

## 6. 개발 단계 로드맵 (요약)

1. **0단계 – 프로젝트 세팅**

   * Next.js + shadcn/ui 초기 세팅
   * Supabase 프로젝트 생성 및 환경변수 연결
   * Resend, Polar, Mintlify 기본 설정

2. **1단계 – 핵심 MVP**

   * `/` 랜딩 + URL 입력 폼
   * `POST /api/analyze-kream` 구현 (KREAM 크롤링 + 결과 반환)
   * 결과 페이지(`/result`)에서 가격 비교 결과 표시
   * 일본 가격은 수동 입력 또는 단일 정가 기준으로 처리

3. **2단계 – 로그인 + 워치리스트**

   * Supabase Auth 연동
   * `/dashboard` 페이지: 워치리스트, 최근 조회 기록
   * `watch_items` 테이블 및 관련 API 구현

4. **3단계 – Cron + 알림**

   * `price_alerts` 테이블 및 설정 UI
   * Vercel Cron + `/api/cron/refresh-prices` 구현
   * Resend 연동으로 이메일 알림 발송

5. **4단계 – 수익화/확장**

   * Polar 연동 (FREE/PRO 플랜)
   * PRO 플랜 유저를 위한 워치리스트 확장, 히스토리 길이 확장, 더 잦은 가격 갱신 등 고급 기능 제공
   * 일본 가격 데이터 소스 확장 및 자동화

---

```
::contentReference[oaicite:0]{index=0}
```

