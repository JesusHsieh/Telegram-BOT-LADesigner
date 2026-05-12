import type { ProjectContext, SearchResult, TaskType } from "./types.js";

export const mockProjects: ProjectContext[] = [
  {
    project_id: "nangang_airport",
    name: "南港機場案",
    project_type: "公共開放空間 / 景觀更新",
    location: "台北市南港區",
    stage: "前期評估",
    budget_level: "中",
    client_preferences: ["自然感", "低維護", "兼具識別性", "可分期施作"],
    design_style: ["城市森林", "簡潔現代", "耐候實用"],
    known_constraints: ["風大", "基地條件需查證", "需確認地下管線與排水", "目前尚未接真實專案資料夾"],
    background_summary:
      "目前為測試資料 / Mock Data。此專案模擬南港地區公共開放空間前期評估，重點在基地條件、植栽適應性、維護與工項風險盤點。",
    mock_items: ["land_mock_001", "site_mock_001", "plant_mock_001", "cost_mock_001", "brief_mock_001"],
    source: "mock_project_data"
  },
  {
    project_id: "南港機場案",
    name: "南港機場案",
    project_type: "公共開放空間 / 景觀更新",
    location: "台北市南港區",
    stage: "前期評估",
    budget_level: "中",
    client_preferences: ["自然感", "低維護", "兼具識別性", "可分期施作"],
    design_style: ["城市森林", "簡潔現代", "耐候實用"],
    known_constraints: ["風大", "基地條件需查證", "需確認地下管線與排水", "目前尚未接真實專案資料夾"],
    background_summary:
      "目前為測試資料 / Mock Data。此專案模擬南港地區公共開放空間前期評估，重點在基地條件、植栽適應性、維護與工項風險盤點。",
    mock_items: ["land_mock_001", "site_mock_001", "plant_mock_001", "cost_mock_001", "brief_mock_001"],
    source: "mock_project_data"
  }
];

const mockSearchItems: SearchResult[] = [
  {
    id: "land_mock_001",
    type: "land",
    title: "台北市大安區敦化段一小段 0123 地號初步檢核",
    summary:
      "目前為測試資料 / Mock Data。示範地號查詢後應整理行政區、地籍資料、周邊條件、需查證項目與後續資料來源。",
    source: "mock_land_data"
  },
  {
    id: "site_mock_001",
    type: "site",
    title: "屋頂花園風、日照與排水條件檢核",
    summary:
      "目前為測試資料 / Mock Data。示範現場條件檢核，包含日照、風壓、排水、覆土深度、動線與安全性。",
    source: "mock_site_data"
  },
  {
    id: "plant_mock_001",
    type: "plant",
    title: "屋頂花園低維護植栽建議",
    summary:
      "目前為測試資料 / Mock Data。示範植栽建議應依日照、風、排水、覆土、維護條件篩選，不保證適地性。",
    source: "mock_plant_data"
  },
  {
    id: "cost_mock_001",
    type: "cost",
    title: "住宅中庭景觀工程工項拆解",
    summary:
      "目前為測試資料 / Mock Data。示範以 WBS 拆分整地、排水、鋪面、植栽、灌溉、照明、養護與容易漏列項目，不提供正式報價。",
    source: "mock_cost_data"
  },
  {
    id: "rfi_mock_001",
    type: "rfi",
    title: "樹穴位置與地下管線衝突 RFI 草稿",
    summary:
      "目前為測試資料 / Mock Data。示範 RFI 應整理問題位置、圖說要求、現況衝突、可能影響、需回覆事項與建議提問對象。",
    source: "mock_rfi_data"
  },
  {
    id: "brief_mock_001",
    type: "brief",
    title: "城市森林中庭簡報文字",
    summary:
      "目前為測試資料 / Mock Data。示範將設計概念整理為主標、副標、業主版說明、空間策略與材料植栽方向。",
    source: "mock_brief_data"
  }
];

export function findProject(projectId: string | undefined): ProjectContext | undefined {
  if (!projectId) return undefined;
  return mockProjects.find((project) => project.project_id === projectId || project.name === projectId);
}

export function listProjectTasks(project: ProjectContext | undefined): SearchResult[] {
  if (!project) return [];
  return mockSearchItems.filter((item) => project.mock_items.includes(item.id));
}

export function searchMockData(query: string, project?: ProjectContext): SearchResult[] {
  const projectItems = listProjectTasks(project);
  const pool = projectItems.length > 0 ? projectItems : mockSearchItems;
  const terms = query
    .toLowerCase()
    .split(/[\s,，、。]+/)
    .filter(Boolean);
  if (terms.length === 0) return pool.slice(0, 5);

  return pool
    .map((item) => ({
      item,
      score: terms.reduce((score, term) => {
        const haystack = [item.id, item.type, item.title, item.summary, item.source].join(" ").toLowerCase();
        return score + (haystack.includes(term) ? 1 : 0);
      }, 0)
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item)
    .slice(0, 5);
}

export function buildMockTaskData(input: {
  taskType: TaskType;
  rawInput: string;
  project?: ProjectContext;
}): unknown {
  const matched = searchMockData(`${input.taskType} ${input.rawInput}`, input.project);
  return {
    notice: "目前為測試資料 / Mock Data",
    task_type: input.taskType,
    input: input.rawInput,
    project_context: input.project,
    matched_items: matched,
    assumptions: [
      "目前尚未讀取真實 NAS、專案資料夾或政府 API。",
      "目前先用 mock data 驗證任務路由、資料整理與回覆格式。",
      "所有基地、法規、成本、契約與工程判斷皆需人工複核。"
    ]
  };
}
