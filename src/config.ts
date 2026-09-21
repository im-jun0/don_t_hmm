/**
 * 화면에 보이는 문구와 설정은 전부 여기서 바꿀 수 있어요.
 */

// Apps Script 웹 앱 URL (.env.local / Vercel 환경변수에서 읽어와요)
export const API_URL = process.env.NEXT_PUBLIC_SHEET_API_URL ?? "";

// 시트에서 바뀐 내용(새 사용자, 새 행)을 반영하는 주기 (ms)
export const POLL_MS = 15000;

// 눌릴 때마다 이 중에서 랜덤으로 하나가 팝업돼요. 자유롭게 추가/삭제하세요.
export const EMOJIS = [
  "😡", "🤬", "😤", "😠", "💢", "😞", "😩", "😫", "😭", "🥲", "😮‍💨", "🫠",
];

export const TEXT = {
  appTitle: "don't hmm",
  pickTitle: "누구세요?",
  pickHint: "위에서 이름을 선택하면 시작돼요.",
  totalSuffix: (n: number) => `지금까지 총 ${n.toLocaleString()}번 참았습니다.`,
  loading: "불러오는 중이에요.",
  emptyUser: "등록된 행동이 아직 없어요. 내 시트 탭에 행을 추가하면 버튼이 생겨요.",
  emptyAll: "사용자 탭이 아직 없어요. 시트에 탭을 만들고 1행에 헤더를 넣어주세요.",
  errorNoUrl:
    "API 주소가 설정되지 않았어요. NEXT_PUBLIC_SHEET_API_URL 환경변수를 확인해주세요.",
  errorFetch:
    "시트에 연결하지 못했어요. 웹 앱 배포 설정(액세스: 모든 사용자)과 URL을 확인해주세요.",
};
