# don't hmm

Supabase를 DB로 쓰는 카운터 웹페이지예요. (Next.js 15 + Tailwind, Vercel 배포)
카카오로 로그인하면 내 행위자별 행동 버튼이 나오고, 누를 때마다 카운트가 올라가요.
메뉴에서 현황(그래프)을 보거나, 항목관리에서 사용자/항목을 직접 관리할 수 있어요.

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에서 프로젝트를 하나 만들어요.
2. `supabase/schema.sql` 파일을 열어서 맨 위 `admin_pin` 값을 원하는 **긴 PIN 문자열로 바꿔요.**
   (숫자 4자리 같은 건 금물 — 항목관리 화면에서 사용자/항목을 지우거나 고칠 때 쓰는 비밀번호예요.)
3. Supabase 프로젝트 > SQL Editor 에 수정한 `supabase/schema.sql` 전체를 붙여넣고 실행해요.
4. Supabase 프로젝트 > Settings > API 에서 **Project URL**과 **publishable key**(`sb_publishable_...`)를 복사해둬요.

> 스키마를 나중에 바꾸고 싶으면 `supabase/schema.sql`을 고치고 SQL Editor에서 다시 실행하면 돼요.

## 2. 카카오 로그인 연결하기

이 앱은 **닉네임만** 받아요. 이메일은 요청하지도, 저장하지도 않아요.
그래서 **비즈 앱 전환이 필요 없어요.** (이유는 아래 "이메일 동의항목 없이 쓰는 법" 참고)

1. [developers.kakao.com](https://developers.kakao.com) 에서 애플리케이션을 하나 만들어요.
2. **앱 설정 > 앱 키** 의 **REST API 키**를 복사해둬요.
3. **제품 설정 > 카카오 로그인** 을 **ON** 으로 켜요.
4. 같은 화면에서 **OpenID Connect** 를 **ON** 으로 켜요. ⚠️ 이거 안 켜면 ID 토큰이 안 나와서 로그인이 안 돼요.
5. **제품 설정 > 카카오 로그인 > 보안** 에서 **Client Secret** 을 생성하고 활성화해요.
6. **제품 설정 > 카카오 로그인 > Redirect URI** 에 **이 앱 주소**를 등록해요.
   (Supabase 주소가 아니에요 — 인가 코드를 우리가 직접 받아요)

   ```
   http://localhost:3000/auth/callback
   https://내앱.vercel.app/auth/callback
   ```

7. **제품 설정 > 카카오 로그인 > 동의항목** 에서 **닉네임(profile_nickname)** 만 **필수 동의**로 켜요.
   **카카오계정(이메일)은 건드리지 않아요.** ("사용 안함" 그대로 두면 돼요)
8. Supabase 프로젝트 > **Authentication > Sign In / Providers > Kakao** 를 켜고,
   2번의 REST API 키를 **Client ID** 에 넣고, **Allow users without an email** 을 **켠 뒤** 저장해요.
   (Client Secret 칸은 비워둬도 돼요. Supabase 는 ID 토큰 검증에만 쓰이고 카카오에 직접 요청하지 않아요)
9. `.env.local` 과 Vercel Environment Variables 에 넣어요.

   | 이름 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 2번의 REST API 키 |
   | `KAKAO_CLIENT_SECRET` | 5번의 Client Secret (`NEXT_PUBLIC_` 금지) |

### 이메일 동의항목 없이 쓰는 법

보통 Supabase 의 카카오 로그인(`signInWithOAuth`)을 쓰면 **이메일을 뺄 수가 없어요.**
Supabase Auth 가 카카오에 보낼 스코프를 서버에 **하드코딩**해두고 있거든요.
([auth/internal/api/provider/kakao.go](https://github.com/supabase/auth/blob/master/internal/api/provider/kakao.go))

```go
oauthScopes := []string{"account_email", "profile_image", "profile_nickname"}
if scopes != "" {
    oauthScopes = append(oauthScopes, strings.Split(scopes, ",")...)  // 덮어쓰기가 아니라 덧붙이기
}
```

`signInWithOAuth` 의 `scopes` 옵션은 이 목록을 **줄이지 못하고 뒤에 붙이기만** 해요.
그런데 `account_email` 은 **비즈 앱에서만** 켤 수 있는 동의항목이라,
개인 개발자 앱에서는 로그인이 아예 이렇게 막혀요.

```
잘못된 요청 (KOE205)
설정하지 않은 카카오 로그인 동의 항목을 포함해 인가 코드를 요청했습니다.
설정하지 않은 동의 항목: account_email
```

**그래서 이 앱은 인가를 직접 받아요.**

```
브라우저 → kauth.kakao.com/oauth/authorize?scope=openid profile_nickname   (우리가 만든 주소)
        ← 인가 코드
서버   → kauth.kakao.com/oauth/token                (client secret 이 필요해서 서버에서)
        ← ID 토큰
브라우저 → supabase.auth.signInWithIdToken({ provider: "kakao", token })
```

Supabase 는 **다 끝난 ID 토큰을 검증만** 해요. 카카오한테 직접 뭘 요청하지 않으니
하드코딩된 `account_email` 이 낄 자리가 없어요. 그래서 비즈 앱 전환도 필요 없어요.

관련 코드는 [`src/lib/api.ts`](src/lib/api.ts) 의 `signInWithKakao` / `completeKakaoSignIn` 과
[`src/app/api/auth/kakao/route.ts`](src/app/api/auth/kakao/route.ts) 예요.

> 나중에 이메일이 정말 필요해지면 그때 비즈 앱으로 전환하고
> `signInWithOAuth({ provider: "kakao" })` 한 줄로 되돌리면 돼요.

### 처음 로그인할 때

카카오 계정 1개가 사용자 1명과 연결돼요. 처음 로그인하면 **이름 연결 화면**이 한 번 떠요.
- 이미 `users` 에 내 이름이 있으면(기존 사용자) 그 이름을 눌러서 연결해요 — 쌓아둔 카운트가 그대로 이어져요.
- 없으면 새 이름을 적어서 시작하면 돼요.

연결은 계정당 한 번이고, 그 뒤로는 로그인만 하면 내 화면이 바로 열려요.
다시 연결하려면 Supabase 의 `users` 테이블에서 해당 행의 `auth_user_id` 를 비우면 돼요.

## 3. 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 열어서 값 채우기 (Supabase 2개 + 카카오 2개는 필수)
npm run dev                  # http://localhost:3000
```

## 4. 미니게임 알림 설정하기

미니게임은 **하루 한 판, 업무시간(기본 10~18시 KST) 중 예고 없는 랜덤 시각**에 시작돼요.
그 시각에 구독자 전원에게 웹 푸시를 쏘는 게 `/api/cron/tick` 이에요.

### 4-1. VAPID 키 만들기

```bash
npx web-push generate-vapid-keys
```

나온 값을 `.env.local` 과 Vercel Environment Variables 에 넣어요.

| 이름 | 값 |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key |
| `VAPID_PRIVATE_KEY` | Private Key (절대 `NEXT_PUBLIC_` 금지) |
| `VAPID_SUBJECT` | `mailto:내메일@example.com` |
| `CRON_SECRET` | 아무 긴 랜덤 문자열 |
| `SUPABASE_SECRET_KEY` | Supabase Settings > API 의 secret key |

### 4-2. 스케줄러 연결하기 (pg_cron)

Supabase 의 `pg_cron` 이 5분마다 `/api/cron/tick` 을 두드려요. Vercel Cron 은 안 써요 —
Hobby 플랜은 cron 이 하루 1회로 제한돼서 랜덤 시각에 알림을 못 쏴요.

`/api/cron/tick` 은 **몇 번을 불러도 결과가 같게** 만들어져 있어서 주기는 자유롭게 잡아도 돼요.
(판이 없으면 만들고, 시작 시각이 지났는데 아직 안 쐈으면 쏘고, 그 외에는 아무것도 안 해요.)

Supabase SQL Editor 에서 **한 번만** 실행하세요.
`<배포주소>` 와 `<CRON_SECRET>` 은 본인 값으로 바꿔주세요.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('dont-hmm-tick', '*/5 * * * *', $job$
  select net.http_get(
    url := 'https://<배포주소>/api/cron/tick',
    headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
  );
$job$);
```

확인은 `select * from cron.job;`, 해제는 `select cron.unschedule('dont-hmm-tick');` 이에요.
잘 도는지는 `select * from cron.job_run_details order by start_time desc limit 10;` 으로 볼 수 있어요.

> `pg_cron` 은 Supabase 대시보드 **Database > Extensions** 에서도 켤 수 있어요.
> 위 `create extension` 이 권한 문제로 막히면 거기서 `pg_cron` 과 `pg_net` 을 먼저 켜주세요.

### 4-3. 카드 숫자가 매일 0 부터 시작하는 방식

**초기화하는 스케줄러는 없어요.** 지우는 작업이 없으니 크론이 안 돌아서 숫자가 안 맞을 일도 없어요.

- 누를 때마다 `item_daily_counts` 의 **(항목, 오늘 날짜)** 행이 1 올라가요.
- 카드는 그 행을 읽어요. 날짜가 바뀌면 그 날짜 행이 아직 없으니 **저절로 0** 이에요.
- 누적은 예전처럼 `items.count` 에 그대로 쌓여요. 현황과 랭킹이 이걸 봐요.
- 날짜 기준은 KST(`now() at time zone 'Asia/Seoul'`)예요. 서버가 UTC 여도 한국 자정에 바뀌어요.

어제 몇 번이었는지 같은 것도 이력에 남아 있어서 나중에 꺼내 쓸 수 있어요.

```sql
-- 항목별 최근 7일
select i.name, d.day, d.count
  from item_daily_counts d join items i on i.id = d.item_id
 where d.day >= (now() at time zone 'Asia/Seoul')::date - 6
 order by d.day desc, d.count desc;
```

### 4-4. 사용자가 알림 켜기

게임 탭에서 **알림 켜기** 를 누르면 돼요.

- **아이폰**: 사파리에서 **공유 > 홈 화면에 추가** 로 설치한 뒤, 그 아이콘으로 열어야 알림 버튼이 나와요. (iOS 웹 푸시 제약)
- **안드로이드 / 데스크톱**: 브라우저에서 바로 켜져요.

### 4-5. 시간대·길이 바꾸기

`src/config.ts` 의 `GAME` 에서 바꿔요.

```ts
export const GAME = {
  durationSec: 30,      // 한 판 길이
  windowStartHour: 10,  // 이 시간대(KST) 안에서 랜덤으로 시작
  windowEndHour: 18,
  leaderboardDays: 30,  // 누적 순위 기간
};
```

랭킹 타이틀은 같은 파일의 `RANK_TITLES` / `LAST_RANK_TITLE` 에 있어요.

## 5. Vercel 배포

1. 이 폴더를 GitHub에 올려요.
2. Vercel에서 **Add New → Project** 로 해당 저장소를 가져와요.
3. **Environment Variables** 에 `.env.local` 에 넣은 값을 그대로 등록해요.

   | 이름 | 없으면 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | 아무것도 안 돌아가요 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 〃 |
   | `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 로그인이 안 돼요 |
   | `KAKAO_CLIENT_SECRET` | 〃 (Client Secret 을 켠 경우) |
   | `SUPABASE_SECRET_KEY` | 미니게임 판이 안 열려요 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 게임 알림이 안 가요 |
   | `CRON_SECRET` | 〃 |

4. 배포한 주소를 **카카오 Redirect URI** (2번 6단계) 에도 추가했는지 확인해요.
5. Deploy!

## 사용자 / 항목 관리

메뉴 → **항목관리** 에서 PIN을 입력하면 사용자(행위자 그룹)와 항목(행위자/행위명/카운트)을 추가·수정·삭제할 수 있어요.
PIN은 `supabase/schema.sql` 실행 시 넣은 `admin_pin` 값이에요.

## 문구 / 이모지 / 패치노트 바꾸기

`src/config.ts` 에서 제목, 안내 문구, 팝업 이모지 목록, 새로고침 주기를 바꿀 수 있어요.
새 기능을 추가했으면 `PATCH_NOTES` 배열 맨 앞에 버전을 추가하세요 — 헤더 벨 아이콘 뱃지와 모달에 자동 반영돼요.

## 참고

- 사이트 전체가 카카오 로그인 뒤에 있어요. 로그인하면 내 화면이 바로 열려요.
- 미니게임은 하루 한 판이에요. 많이 누를수록 1등인데, 그건 내 동료가 그만큼 시끄러웠다는 뜻이에요.
- 랭킹 탭에는 두 부문이 있어요 — 누적 카운트(가장 부지런한 동료를 둔 친구)와 미니게임 누적(목표 지향적인 동료를 둔 친구).
- 탑3 안에 들면 랭킹 탭에 들어갈 때 색종이가 날리고 팡파레가 울려요. 부문 이름은 `src/config.ts` 의 `TEXT.ranking` 에서 바꿔요.
- 로그인한 사람은 누구나 카운트를 올릴 수 있어요 — 사내 공유용이라 계정 화이트리스트는 없어요.
- 항목관리는 PIN으로 보호되지만, PIN은 DB 함수에서만 검증돼요 — publishable 키가 노출돼도 PIN 없이는 데이터를 못 고쳐요.
