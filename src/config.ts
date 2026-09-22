/**
 * 화면에 보이는 문구와 설정은 전부 여기서 바꿀 수 있어요.
 */

// 시트에서 바뀐 내용(새 사용자, 새 행)을 반영하는 주기 (ms)
export const POLL_MS = 15000;

// 눌릴 때마다 이 중에서 랜덤으로 하나가 팝업돼요. 자유롭게 추가/삭제하세요.
export const EMOJIS = [
  "😡", "🤬", "😤", "😠", "💢", "😞", "😩", "😫", "😭", "🥲", "😮‍💨", "🫠",
];

export const NAV = [
  { key: "stats", href: "/stats", label: "현황" },
  { key: "main", href: "/", label: "메인" },
  { key: "manage", href: "/manage", label: "항목관리" },
] as const;

export const TEXT = {
  appTitle: "don't hmm",
  pickTitle: "누구세요?",
  pickHint: "위에서 이름을 선택하면 시작돼요.",
  totalSuffix: (n: number) => `지금까지 총 ${n.toLocaleString()}번 참았습니다.`,
  loading: "불러오는 중이에요.",
  emptyUser: "등록된 행동이 아직 없어요. 항목관리에서 추가해보세요.",
  emptyAll: "사용자가 아직 없어요. 항목관리에서 추가해보세요.",
  errorNoUrl:
    "DB 연결이 설정되지 않았어요. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 환경변수를 확인해주세요.",
  errorFetch: "데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",

  stats: {
    noUser: "위에서 이름을 선택하면 현황이 보여요.",
    totalLabel: "총 참은 횟수",
    itemLabel: "등록된 항목",
    actorLabel: "행위자 수",
    barTitle: "항목별 누적",
    lineTitle: "최근 14일 추이",
    lineNote: "추이는 전환 시점(오늘)부터 쌓여요. 이전 누적 총계는 막대그래프에 포함돼 있어요.",
    empty: "아직 데이터가 없어요.",
  },

  manage: {
    pinPrompt: "항목관리 PIN을 입력하세요.",
    pinPlaceholder: "PIN",
    pinSubmit: "확인",
    pinWrong: "PIN이 올바르지 않아요.",
    usersTitle: "사용자",
    addUser: "사용자 추가",
    userNamePlaceholder: "사용자 이름",
    itemsTitle: "항목",
    addItem: "항목 추가",
    actorPlaceholder: "행위자",
    namePlaceholder: "행위명",
    save: "저장",
    cancel: "취소",
    delete: "삭제",
    deleteConfirm: "정말 삭제할까요? 되돌릴 수 없어요.",
    noUserSelected: "먼저 위에서 사용자를 선택해주세요.",
    saveFailed: "저장하지 못했어요. PIN을 다시 확인해주세요.",
  },
} as const;

/** 새 버전이 나오면 배열 맨 앞에 추가하세요. 헤더 벨 뱃지 + 모달에 자동 반영돼요. */
export const PATCH_NOTES = [
  {
    version: "2.0.0",
    date: "2026-09-22",
    items: [
      "구글시트 대신 Supabase(DB)를 사용해서 훨씬 빨라졌어요.",
      "메뉴에 현황(그래프)과 항목관리 화면이 추가됐어요.",
      "이제 시트를 안 고쳐도 웹에서 바로 사용자/항목을 관리할 수 있어요.",
    ],
  },
] as const;

export const CURRENT_VERSION = PATCH_NOTES[0].version;
