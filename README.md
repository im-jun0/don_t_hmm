# don't hmm

Supabase를 DB로 쓰는 카운터 웹페이지예요. (Next.js 15 + Tailwind, Vercel 배포)
상단에서 사용자(나)를 고르면 내 행위자별 행동 버튼이 나오고, 누를 때마다 카운트가 올라가요.
메뉴에서 현황(그래프)을 보거나, 항목관리에서 사용자/항목을 직접 관리할 수 있어요.

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에서 프로젝트를 하나 만들어요.
2. `supabase/schema.sql` 파일을 열어서 맨 위 `admin_pin` 값을 원하는 **긴 PIN 문자열로 바꿔요.**
   (숫자 4자리 같은 건 금물 — 항목관리 화면에서 사용자/항목을 지우거나 고칠 때 쓰는 비밀번호예요.)
3. Supabase 프로젝트 > SQL Editor 에 수정한 `supabase/schema.sql` 전체를 붙여넣고 실행해요.
4. Supabase 프로젝트 > Settings > API 에서 **Project URL**과 **publishable key**(`sb_publishable_...`)를 복사해둬요.

> 스키마를 나중에 바꾸고 싶으면 `supabase/schema.sql`을 고치고 SQL Editor에서 다시 실행하면 돼요.

## 2. 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 열어서 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 붙여넣기
npm run dev                  # http://localhost:3000
```

## 3. Vercel 배포

1. 이 폴더를 GitHub에 올려요.
2. Vercel에서 **Add New → Project** 로 해당 저장소를 가져와요.
3. **Environment Variables** 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 를 등록해요.
4. Deploy!

## 사용자 / 항목 관리

메뉴 → **항목관리** 에서 PIN을 입력하면 사용자(행위자 그룹)와 항목(행위자/행위명/카운트)을 추가·수정·삭제할 수 있어요.
PIN은 `supabase/schema.sql` 실행 시 넣은 `admin_pin` 값이에요.

## 문구 / 이모지 / 패치노트 바꾸기

`src/config.ts` 에서 제목, 안내 문구, 팝업 이모지 목록, 새로고침 주기를 바꿀 수 있어요.
새 기능을 추가했으면 `PATCH_NOTES` 배열 맨 앞에 버전을 추가하세요 — 헤더 벨 아이콘 뱃지와 모달에 자동 반영돼요.

## 참고

- 접속하는 누구나 메인 화면의 버튼을 누를 수 있어요. (로그인 없음) 사내 공유용으로 링크만 돌리는 용도예요.
- 링크 끝에 `#/김대리` 처럼 사용자 이름을 붙이면 그 사용자 화면으로 바로 열려요.
- 항목관리는 PIN으로 보호되지만, PIN은 DB 함수에서만 검증돼요 — publishable 키가 노출돼도 PIN 없이는 데이터를 못 고쳐요.
