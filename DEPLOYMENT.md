# 배포 가이드

## 1. Vercel 배포 (권장)

Vercel은 Next.js에 최적화된 플랫폼으로, 가장 쉽고 빠른 배포 방법입니다.

### 1.1 GitHub에 코드 푸시

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit"

# GitHub 리포지토리 생성 후
git remote add origin https://github.com/YOUR_USERNAME/kream-price-tracker.git
git branch -M main
git push -u origin main
```

### 1.2 Vercel 배포

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. **New Project** → GitHub 리포지토리 선택
4. **Import** 클릭

### 1.3 환경 변수 설정

**Environment Variables** 섹션에서 추가:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
RESEND_API_KEY=re_...
POLAR_API_KEY=polar_...
POLAR_PRO_PRODUCT_ID=prod_...
CRON_SECRET=your-random-secret-string
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Environment**: Production, Preview, Development 모두 체크

### 1.4 Deploy 클릭

배포가 완료되면 URL이 제공됩니다: `https://your-project.vercel.app`

### 1.5 배포 후 설정

#### Supabase Redirect URL

Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://your-project.vercel.app
Redirect URLs: https://your-project.vercel.app/auth/callback
```

#### Resend Domain

1. Resend Dashboard → Domains
2. 도메인 추가 및 DNS 인증
3. 발신 이메일 주소 설정

#### Polar Webhook

Polar Dashboard → Settings → Webhooks:

```
Webhook URL: https://your-project.vercel.app/api/webhooks/polar
Events: checkout.succeeded, subscription.cancelled
```

#### Vercel Cron

`vercel.json`에 이미 설정되어 있습니다:
- 4시간마다 자동 실행
- `/api/cron/refresh-prices` 호출

### 1.6 자동 배포

코드 변경 후 GitHub에 푸시하면 자동으로 재배포됩니다:

```bash
git add .
git commit -m "Update feature"
git push
```

---

## 2. Docker 배포 (자체 서버)

VPS나 자체 서버에 배포하는 방법입니다.

### 2.1 사전 준비

서버에 Docker와 Docker Compose 설치:

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.2 프로젝트 배포

```bash
# 서버에 코드 복사
scp -r . user@your-server:/path/to/kream-price-tracker

# 또는 Git clone
ssh user@your-server
cd /path/to
git clone https://github.com/YOUR_USERNAME/kream-price-tracker.git
cd kream-price-tracker
```

### 2.3 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
nano .env
```

모든 환경 변수 입력

### 2.4 Docker 빌드 및 실행

```bash
# 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps
```

애플리케이션이 `http://your-server:3000`에서 실행됩니다.

### 2.5 Nginx 리버스 프록시 (선택)

Nginx 설정 (`/etc/nginx/sites-available/kream`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

활성화:

```bash
sudo ln -s /etc/nginx/sites-available/kream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2.6 SSL 인증서 (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2.7 Cron Job 설정

Docker 배포에서는 Vercel Cron 대신 시스템 cron을 사용:

```bash
crontab -e
```

추가:

```
0 */4 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/refresh-prices
```

### 2.8 업데이트

```bash
# 새 코드 가져오기
git pull

# 재빌드 및 재시작
docker-compose up -d --build

# 또는 무중단 재시작
docker-compose build
docker-compose up -d --no-deps --build app
```

---

## 3. PM2로 배포 (Node.js 서버)

### 3.1 PM2 설치

```bash
npm install -g pm2
```

### 3.2 빌드 및 실행

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 실행
pm2 start npm --name "kream-tracker" -- start

# 자동 시작 설정
pm2 startup
pm2 save
```

### 3.3 관리 명령어

```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs kream-tracker

# 재시작
pm2 restart kream-tracker

# 중지
pm2 stop kream-tracker

# 삭제
pm2 delete kream-tracker
```

---

## 4. 환경별 설정

### 개발 환경

```bash
npm run dev
```

### 프로덕션 환경

```bash
npm run build
npm start
```

---

## 5. 모니터링

### Vercel

- 대시보드에서 로그, 성능, 에러 확인
- Real-time 모니터링 제공

### Docker/PM2

```bash
# Docker 로그
docker-compose logs -f

# PM2 모니터링
pm2 monit

# PM2 웹 대시보드 (선택)
pm2 install pm2-server-monit
```

---

## 6. 트러블슈팅

### 빌드 실패

```bash
# 캐시 삭제
rm -rf .next node_modules
npm install
npm run build
```

### 환경 변수 문제

- `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- 모든 필수 환경 변수가 설정되어 있는지 확인
- Vercel: 환경 변수 수정 후 Redeploy 필요

### Supabase 연결 실패

- URL과 Key가 정확한지 확인
- RLS 정책이 올바르게 설정되어 있는지 확인
- 네트워크 연결 확인

### Cron이 작동하지 않음

**Vercel:**
- `vercel.json` 파일이 프로젝트 루트에 있는지 확인
- Vercel Pro 플랜 필요 (Hobby는 제한적)

**Docker/PM2:**
- cron job이 올바르게 설정되어 있는지 확인
- `CRON_SECRET` 환경 변수 확인

---

## 7. 보안 체크리스트

- [ ] 모든 환경 변수가 안전하게 관리되고 있는지 확인
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] Supabase RLS가 올바르게 설정되어 있는지 확인
- [ ] `CRON_SECRET`이 충분히 복잡한지 확인
- [ ] HTTPS 인증서가 설정되어 있는지 확인
- [ ] 정기적인 의존성 업데이트

---

## 8. 성능 최적화

### 이미지 최적화

`next/image` 사용 (현재 `<img>` 사용 중):

```tsx
import Image from 'next/image';

<Image
  src={item.image_url}
  alt={item.title}
  width={64}
  height={64}
  className="object-cover rounded"
/>
```

### 데이터베이스 인덱스

Supabase에서 인덱스가 올바르게 설정되어 있는지 확인

### CDN 캐싱

Vercel은 자동으로 정적 파일을 CDN에 캐싱합니다.

---

## 추천 배포 방법

- **개인 프로젝트/MVP**: **Vercel** (무료, 간단)
- **소규모 팀**: **Vercel Pro** ($20/월, Cron 무제한)
- **대규모/엔터프라이즈**: **Docker on AWS/GCP** (완전 제어)

Vercel 배포가 가장 간단하고 빠르며, Cron도 자동으로 작동합니다!
