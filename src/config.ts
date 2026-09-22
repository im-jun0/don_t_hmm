/**
 * 화면에 보이는 문구와 설정은 전부 여기서 바꿀 수 있어요.
 */

// 시트에서 바뀐 내용(새 사용자, 새 행)을 반영하는 주기 (ms)
export const POLL_MS = 15000;

// 눌릴 때마다 이 중에서 랜덤으로 하나가 팝업돼요. 자유롭게 추가/삭제하세요.
export const EMOJIS = [
  "😡", "🤬", "😤", "😠", "💢", "😞", "😩", "😫", "😭", "🥲", "😮‍💨", "🫠",
];

// 카드 꾸미기 색상 프리셋 (파스텔 톤 — 기본적으로 검정 텍스트가 어울려요)
export const CARD_BACKGROUND_COLORS = [
  "#fde2e2", "#fde7c8", "#fdf3c8", "#dff5d8",
  "#d6f0ee", "#d9e8fb", "#e6def8", "#fbdff0",
];

export const NAV = [
  { key: "main", href: "/", label: "메인" },
  { key: "game", href: "/game", label: "게임" },
  { key: "stats", href: "/stats", label: "현황" },
  { key: "ranking", href: "/ranking", label: "랭킹" },
  { key: "manage", href: "/manage", label: "관리" },
] as const;

/** 랭킹 탑 몇 등까지 빵빠레를 울릴지 */
export const FANFARE_RANK = 3;

/**
 * 위장 테마에서 내 항목에 붙일 가짜 앱 이름. 항목 순서대로 하나씩 가져다 써요.
 *
 * ⚠️ DisguiseIcons 의 들러리 앱 이름과 절대 겹치면 안 돼요.
 * 한 화면에 "메모"가 두 개 있으면 진짜 아이폰에는 없는 일이라 바로 들통나요.
 * 여기에 이름을 추가할 땐 DECOY_APPS 의 label 과 안 겹치는지 확인해주세요.
 */
export const DISGUISE_APP_NAMES = [
  "주식", "나침반", "측정", "단축어", "팁", "음성 메모",
  "번역", "돋보기", "책", "홈", "연락처", "FaceTime",
  "TV", "피트니스", "프리폼", "저널", "뉴스", "찾기",
  "Watch", "날씨 위젯",
];

/** 미니게임 설정. 시작 시각은 매일 windowStartHour~windowEndHour(KST) 사이에서 랜덤으로 뽑혀요. */
export const GAME = {
  durationSec: 30,
  windowStartHour: 10,
  windowEndHour: 18,
  pollMs: 10000, // 게임 화면에서 "지금 시작됐나?" 확인하는 주기
  leaderboardDays: 30,
};

/**
 * 많이 누른 사람이 1등이에요 — 내 동료가 그만큼 시끄러웠다는 뜻이죠.
 * 그래서 타이틀은 전부 비꼬는 톤이에요. 1등한테 "조용한 동료를 두셨네요" 하고 놀리는 거예요.
 */
export const RANK_TITLES = [
  "가장 성실한 동료를 둔 친구",
  "평온한 사무실의 주인공",
  "적막 속에서 일하는 사람",
] as const;

/** 꼴등 = 진짜로 아무 일도 없었던 사람 */
export const LAST_RANK_TITLE = "혼자 일하시나요?";

export const TEXT = {
  appTitle: "don't hmm",
  pickTitle: "누구세요?",
  pickHint: "카카오로 로그인하면 내 화면이 바로 열려요.",
  totalSuffix: (n: number) => `오늘 ${n.toLocaleString()}번 참았습니다.`,
  loading: "불러오는 중이에요.",
  emptyUser: "등록된 행동이 아직 없어요. 항목관리에서 추가해보세요.",
  emptyAll: "사용자가 아직 없어요. 항목관리에서 추가해보세요.",
  errorNoUrl:
    "DB 연결이 설정되지 않았어요. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 환경변수를 확인해주세요.",
  errorFetch: "데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",

  stats: {
    noUser: "카카오로 로그인하면 현황이 보여요.",
    totalLabel: "총 참은 횟수",
    itemLabel: "등록된 항목",
    actorLabel: "행위자 수",
    todayTitle: "오늘 친구들",
    todayHint: "자정이 지나면 다 같이 0 부터 다시 시작해요.",
    barTitle: "항목별 누적",
    lineTitle: "최근 14일 추이",
    lineNote: "추이는 전환 시점(오늘)부터 쌓여요. 이전 누적 총계는 막대그래프에 포함돼 있어요.",
    empty: "아직 데이터가 없어요.",
  },

  login: {
    title: "Don't Hmm",
    subtitle: ["당신의 동료는 지금 몇 번이나", "아무 의미 없이 소리를 냈을까요?"],
  },

  disguise: {
    toggleLabel: "테마 변경",
    exitLabel: "설정",
    empty: "등록된 앱이 없어요.",
  },

  ranking: {
    title: "랭킹",
    subtitle: "많이 쌓였다는 건, 내 동료가 그만큼 열심이었다는 뜻이에요.",
    totalAward: "가장 부지런한 동료를 둔 친구",
    totalHint: "지금까지 쌓인 카운트를 전부 더했어요.",
    gameAward: "목표 지향적인 동료를 둔 친구",
    gameHint: (days: number) => `최근 ${days}일 미니게임 누적이에요.`,
    empty: "아직 순위를 매길 기록이 없어요.",
    congrats: (rank: number, award: string) => `${award} ${rank}등!`,
    congratsSub: "축하드립니다. 오늘도 고생 많으셨어요.",
  },

  game: {
    title: "🤫 Don't Hmm",
    liveHint: "30초 동안 아무 소리도, 행동도 하지 마세요.",
    tapHint: "동료가 소리를 냈다면 누르세요.",
    tapButton: "소리 냈다",
    waitingTitle: "오늘 판은 아직이에요",
    waitingHint: "업무시간 중 예고 없이 딱 한 번 시작돼요. 알림을 켜두면 놓치지 않아요.",
    noRound: "아직 진행된 판이 없어요. 첫 판을 기다려주세요.",
    doneTitle: "이번 판 끝!",
    myCount: (n: number) => `${n}번 눌렀어요.`,
    roundRanking: "이번 판 순위",
    rankingEmpty: "아직 아무도 누르지 않았어요. 평화로운 하루네요.",
    pushEnable: "알림 켜기",
    pushDisable: "알림 끄기",
    pushOn: "알림이 켜져 있어요.",
    pushOff: "알림을 켜두면 판이 시작될 때 알려드려요.",
    pushDenied: "브라우저에서 알림이 막혀 있어요. 사이트 설정에서 알림을 허용해주세요.",
    pushFailed: "알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.",
    pushUnsupported:
      "이 브라우저에서는 알림을 켤 수 없어요. 아이폰은 사파리에서 공유 > 홈 화면에 추가 로 설치한 뒤 열어주세요.",
  },

  auth: {
    loginButton: "카카오로 로그인",
    loginShort: "로그인",
    logout: "로그아웃",
    linkTitle: "이름을 연결해주세요",
    linkHint: "이 카카오 계정으로 쓸 이름을 한 번만 골라주세요. 다음부터는 바로 열려요.",
    linkPick: "기존 이름에 연결하기",
    linkCreate: "새 이름으로 시작하기",
    linkCreatePlaceholder: "이름 (예: 김대리)",
    linkSubmit: "시작",
    linkFailed: "연결하지 못했어요. 다른 이름을 골라주세요.",
    duplicateName: "이미 있는 이름이에요.",
    callback: "로그인 중이에요...",
    callbackFailed: "로그인에 실패했어요. 처음 화면에서 다시 시도해주세요.",
    missingKakaoKey:
      "카카오 앱 키가 설정되지 않았어요. NEXT_PUBLIC_KAKAO_REST_API_KEY 환경변수를 확인해주세요.",
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

  cardStyle: {
    title: "카드 꾸미기",
    colorTab: "배경색",
    customColor: "직접 고르기",
    imageTab: "이미지 업로드",
    uploading: "올리는 중이에요...",
    tooLarge: "5MB 이하 이미지만 올릴 수 있어요.",
    reset: "기본값으로",
    saveFailed: "저장하지 못했어요. 잠시 후 다시 시도해주세요.",
  },
} as const;

/** 새 버전이 나오면 배열 맨 앞에 추가하세요. 헤더 벨 뱃지 + 모달에 자동 반영돼요. */
export const PATCH_NOTES = [
  {
    version: "2.7.0",
    date: "2026-09-23",
    items: [
      "현황에서 친구들이 오늘 몇 번 눌렀는지 한 줄씩 볼 수 있어요.",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-09-23",
    items: [
      "카드 숫자는 이제 오늘치예요. 날짜가 바뀌면 0 부터 다시 시작해요.",
      "누적은 그대로 쌓여요 — 현황과 랭킹에서는 지금까지 모은 총합이 보여요.",
      "날짜별 기록이 남아서 나중에 \"어제는 몇 번\" 같은 것도 볼 수 있어요.",
      "위장 테마에서 가짜 상태바(시각·배터리)를 뺐어요. 진짜 상태바가 이미 위에 있으니까요.",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-09-23",
    items: [
      "위장 테마가 생겼어요 — 헤더의 반달 버튼을 누르면 평범한 홈 화면처럼 보여요.",
      "등록한 이미지가 그대로 앱 아이콘이 되고, 카운트는 빨간 뱃지로 나와요. 눌러도 이모지가 안 튀어요.",
      "독 맨 오른쪽 설정을 누르면 원래 화면으로 돌아와요. 폰에서만 동작해요.",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-09-23",
    items: [
      "하단 메뉴바를 키우고 아이콘을 넣었어요. 폰에서 잘 안 눌리던 게 나아졌어요.",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-09-22",
    items: [
      "랭킹 탭이 생겼어요 — [가장 부지런한 동료를 둔 친구] 와 [목표 지향적인 동료를 둔 친구] 두 부문이에요.",
      "탑3 안에 들었으면 랭킹 탭에 들어갈 때 빵빠레가 울려요. 🎉",
      "미니게임 누적 순위는 랭킹 탭으로 옮겼어요. 게임 탭에는 이번 판 순위만 남아요.",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-09-22",
    items: [
      "미니게임이 생겼어요 — 업무시간 중 예고 없이 한 번, 30초 동안 아무 소리도 내지 않기.",
      "게임 탭에서 알림을 켜두면 판이 시작될 때 알려드려요. (아이폰은 홈 화면에 추가한 뒤에 켜주세요)",
      "많이 누른 사람이 1등, 타이틀은 '가장 성실한 동료를 둔 친구'예요. 축하드립니다.",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-09-22",
    items: [
      "카카오 로그인이 생겼어요 — 로그인하면 이름을 고르지 않아도 내 화면이 바로 열려요.",
      "처음 로그인할 때 쓰던 이름을 한 번만 연결하면, 그 뒤로는 기기를 바꿔도 그대로예요.",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-09-22",
    items: [
      "카드를 꾸밀 수 있어요 — 카드의 ⋯ 메뉴나 2초 꾹 누르기로 배경색·배경 이미지를 지정해보세요.",
    ],
  },
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
