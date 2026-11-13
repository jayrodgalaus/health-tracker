export const DOCS_TOPICS = [
  {id:'today', label:'Today and daily totals'},
  {id:'log', label:'Daily logging'},
  {id:'food', label:'Food lookup and nutrition labels'},
  {id:'nutrition', label:'Nutrient terms and units'},
  {id:'exercise', label:'Exercise and energy estimates'},
  {id:'weight', label:'Weight and historical records'},
  {id:'calendar', label:'Calendar colors and day completion'},
  {id:'day-detail', label:'Day details and explainable rules'},
  {id:'trends', label:'Trends and coverage'},
  {id:'kitchen', label:'Kitchen'},
  {id:'profile', label:'Profile and daily background movement'},
  {id:'goals', label:'Goals, tracking targets and thresholds'},
  {id:'preferences', label:'Water and nutrient comparison preferences'},
  {id:'data', label:'Storage, backup and restoration'},
  {id:'about', label:'Health notice and limitations'},
  {id:'glossary', label:'Glossary'}
] as const
export type DocsTopicId = (typeof DOCS_TOPICS)[number]['id']
