import { searchMockData } from "../office/mockData.js";
import type { ProjectContext, SearchResult } from "../office/types.js";

export function searchData(query: string, project?: ProjectContext): SearchResult[] {
  return searchMockData(query, project);
}
