import materials from "../data/materials.json" with { type: "json" };

type Material = (typeof materials)[number];

export function findMaterials(query: string): Material[] {
  return materials
    .filter((material) => {
      const haystack = [
        material.category,
        material.name,
        material.style,
        material.cost_level,
        material.maintenance_level,
        material.durability,
        material.suitable_scene,
        material.avoid_scene
      ].join(" ");
      return scoreText(query, haystack) > 0;
    })
    .slice(0, 8);
}

function scoreText(query: string, text: string): number {
  const keywords = query.split(/[，,、\s]+/).filter(Boolean);
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}
