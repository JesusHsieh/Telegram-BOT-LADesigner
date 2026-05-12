import workItems from "../data/work_items.json" with { type: "json" };

type WorkItem = (typeof workItems)[number];

export function findWorkItems(query: string): WorkItem[] {
  return workItems
    .filter((item) => {
      const haystack = [
        item.category,
        item.item_name,
        item.unit,
        item.quantity_rule,
        item.cost_level,
        item.risk_factor,
        item.related_materials.join(" "),
        item.required_info.join(" "),
        item.note
      ].join(" ");
      return scoreText(query, haystack) > 0;
    })
    .slice(0, 12);
}

function scoreText(query: string, text: string): number {
  const keywords = query.split(/[，,、\s]+/).filter(Boolean);
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}
