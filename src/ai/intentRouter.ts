export type LandscapeIntent =
  | "idea"
  | "plant"
  | "material"
  | "cost"
  | "brief"
  | "diary"
  | "rfi";

const commands = new Set(["idea", "plant", "material", "cost", "brief", "diary", "rfi", "help", "start"]);

export function parseCommand(input: string): { command?: LandscapeIntent | "help" | "start"; content: string } {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/([a-zA-Z_]+)(?:@\w+)?\s*(.*)$/s);
  if (!match) return { content: trimmed };

  const command = match[1].toLowerCase();
  if (!commands.has(command)) return { content: trimmed };

  return {
    command: command as LandscapeIntent | "help" | "start",
    content: match[2].trim()
  };
}

export function detectIntent(input: string): LandscapeIntent | "unknown" {
  const text = input.toLowerCase();

  if (hasAny(text, ["rfi", "疑義", "圖說衝突", "地下管線", "釐清", "變更設計", "現場不符"])) return "rfi";
  if (hasAny(text, ["日報", "今日施工", "工班", "人力", "機具", "停工", "完成數量"])) return "diary";
  if (hasAny(text, ["簡報", "文案", "設計說明", "業主版", "審查", "一句話"])) return "brief";
  if (hasAny(text, ["預算", "成本", "單價", "估價", "工項", "數量", "工資", "概算"])) return "cost";
  if (hasAny(text, ["鋪面", "材料", "花台", "座椅", "燈具", "欄杆", "水景", "木平台"])) return "material";
  if (hasAny(text, ["植物", "植栽", "樹種", "喬木", "灌木", "地被", "日照", "低維護", "耐陰"])) return "plant";
  if (hasAny(text, ["基地", "中庭", "風格", "概念", "設計方向", "住宅", "公園", "屋頂花園"])) return "idea";

  return "unknown";
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}
