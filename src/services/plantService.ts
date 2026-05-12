import plants from "../data/plants.json" with { type: "json" };

type Plant = (typeof plants)[number];

export function findPlants(query: string): Plant[] {
  return plants
    .filter((plant) => {
      const haystack = [
        plant.chinese_name,
        plant.scientific_name,
        plant.plant_type,
        plant.sunlight,
        plant.water_need,
        plant.maintenance_level,
        plant.suitable_site,
        plant.avoid_site,
        plant.taiwan_region,
        plant.design_usage
      ].join(" ");
      return scoreText(query, haystack) > 0;
    })
    .slice(0, 8);
}

function scoreText(query: string, text: string): number {
  const keywords = query.split(/[，,、\s]+/).filter(Boolean);
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}
