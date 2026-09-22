// 1회용: 기존 구글시트(Apps Script 웹앱) 데이터를 Supabase 로 옮겨요.
//
// 실행: node --env-file=.env.local scripts/migrate-from-sheets.mjs
// 필요한 환경변수: NEXT_PUBLIC_SHEET_API_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
// (SUPABASE_SECRET_KEY 는 RLS 를 우회해야 해서 필요해요. NEXT_PUBLIC_ 로 절대 노출하지 마세요.)

import { createClient } from "@supabase/supabase-js";

const SHEET_API_URL = process.env.NEXT_PUBLIC_SHEET_API_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SHEET_API_URL || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    "NEXT_PUBLIC_SHEET_API_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 환경변수가 모두 필요해요."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

async function main() {
  const usersRes = await fetch(SHEET_API_URL).then((r) => r.json());
  if (usersRes.error) throw new Error(usersRes.error);
  const names = usersRes.users ?? [];
  console.log(`사용자 ${names.length}명 발견`);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const { data: user, error: userErr } = await supabase
      .from("users")
      .upsert({ name, sort_order: i }, { onConflict: "name" })
      .select()
      .single();
    if (userErr) throw userErr;

    const rowsRes = await fetch(`${SHEET_API_URL}?user=${encodeURIComponent(name)}`).then((r) =>
      r.json()
    );
    if (rowsRes.error) throw new Error(rowsRes.error);
    const rows = rowsRes.rows ?? [];

    if (rows.length > 0) {
      const { error: itemsErr } = await supabase.from("items").insert(
        rows.map((r) => ({
          user_id: user.id,
          actor: r.actor,
          name: r.name,
          count: r.count,
          sort_order: r.id,
        }))
      );
      if (itemsErr) throw itemsErr;
    }
    console.log(`  ${name}: 항목 ${rows.length}개 이전 완료`);
  }

  console.log("이전 완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
