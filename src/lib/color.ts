/** 배경색(hex)에 맞춰 읽기 쉬운 텍스트 색(흑/백)을 골라줘요. */
export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}
