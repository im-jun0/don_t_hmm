/**
 * 시트 구조
 *  - 시트 탭 1개 = 사용자 1명 (탭 이름이 화면 상단의 사용자 이름이 돼요)
 *  - 각 탭의 1행은 헤더 (컬럼 순서는 상관없어요)
 *
 *      순번 | 행위자 | 행위명 | 카운트
 *
 *    예) [김대리 탭]
 *        1 | 김과장 | 회의 중 다리떨기 | 0
 *        2 | 김과장 | 슬랙 읽씹 | 0
 *        3 | 박대리 | 점심 먹고 낮잠 | 0
 *
 *  - 사용자 = 이 사이트를 쓰는 사람 (탭 이름)
 *  - 행위자 = 카운팅 당하는 사람 (컬럼)
 *  - 탭 이름이 _ 로 시작하거나, 숨긴 탭이거나, 비어 있는 탭은 사용자로 안 보여요.
 *  - 순번은 같은 탭 안에서 겹치지 않게 넣어주세요.
 *
 * 사용법
 * 1) 구글시트 > 확장 프로그램 > Apps Script 에 이 코드를 붙여넣기
 * 2) (선택) setup 함수를 한 번 실행하면 예시 탭이 만들어져요
 * 3) 배포 > 새 배포 > 유형: 웹 앱
 *    - 실행 사용자: 나
 *    - 액세스 권한: 모든 사용자
 * 4) 발급된 웹 앱 URL(.../exec)을 NEXT_PUBLIC_SHEET_API_URL 에 넣기
 *
 * 코드를 수정한 뒤에는 "배포 관리 > 수정 > 새 버전"으로 다시 배포해야 반영돼요.
 */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// 사용자 목록 = 사용 가능한 시트 탭 이름
function listUsers_() {
  return ss_()
    .getSheets()
    .filter(function (s) {
      return (
        s.getName().charAt(0) !== "_" && !s.isSheetHidden() && s.getLastRow() > 0
      );
    })
    .map(function (s) {
      return s.getName();
    });
}

// 헤더 이름으로 컬럼 위치를 찾아요
function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const header = values[0].map(function (h) {
    return String(h).trim();
  });
  const col = {
    id: header.indexOf("순번"),
    actor: header.indexOf("행위자"),
    name: header.indexOf("행위명"),
    count: header.indexOf("카운트"),
  };
  if (col.id < 0 || col.actor < 0 || col.name < 0 || col.count < 0) {
    throw new Error(
      "'" + sheet.getName() + "' 탭의 1행 헤더는 순번 / 행위자 / 행위명 / 카운트 여야 해요."
    );
  }
  return { sheet: sheet, values: values, col: col };
}

// 조회
//   ?            -> { users: [...] }
//   ?user=이름   -> { users: [...], rows: [...] }
function doGet(e) {
  try {
    const users = listUsers_();
    const user = e && e.parameter && e.parameter.user;
    if (!user) return json_({ users: users });

    const sheet = ss_().getSheetByName(user);
    if (!sheet || users.indexOf(user) < 0) return json_({ users: users, rows: [] });

    const t = readTable_(sheet);
    const rows = t.values
      .slice(1)
      .filter(function (r) {
        return r[t.col.id] !== "" && String(r[t.col.name]).trim() !== "";
      })
      .map(function (r) {
        return {
          id: Number(r[t.col.id]),
          actor: String(r[t.col.actor]).trim() || "미지정",
          name: String(r[t.col.name]).trim(),
          count: Number(r[t.col.count]) || 0,
        };
      });
    return json_({ users: users, rows: rows });
  } catch (err) {
    return json_({ error: String(err.message || err) });
  }
}

// 카운트 +1  (body: {"user": "탭 이름", "id": 순번})
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // 동시에 눌러도 숫자가 꼬이지 않게
  try {
    const body = JSON.parse(e.postData.contents);
    const id = Number(body.id);
    const sheet = ss_().getSheetByName(String(body.user));
    if (!sheet) return json_({ error: "사용자 탭을 찾을 수 없어요." });

    const t = readTable_(sheet);
    for (let i = 1; i < t.values.length; i++) {
      if (Number(t.values[i][t.col.id]) === id) {
        const next = (Number(t.values[i][t.col.count]) || 0) + 1;
        sheet.getRange(i + 1, t.col.count + 1).setValue(next);
        return json_({ id: id, count: next });
      }
    }
    return json_({ error: "해당 순번을 찾을 수 없어요." });
  } catch (err) {
    return json_({ error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// (선택) 예시 탭 만들기 - Apps Script 편집기에서 한 번만 실행하세요
function setup() {
  const name = "사용자1";
  const sheet = ss_().getSheetByName(name) || ss_().insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 4, 4).setValues([
      ["순번", "행위자", "행위명", "카운트"],
      [1, "김과장", "회의 중 다리떨기", 0],
      [2, "김과장", "슬랙 읽씹", 0],
      [3, "박대리", "점심 먹고 낮잠", 0],
    ]);
  }
}
