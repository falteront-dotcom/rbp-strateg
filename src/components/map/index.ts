"use client";

export { StrategicMap, default as StrategicMapDefault } from "./StrategicMap";
export { ChoroplethLayer, default as ChoroplethLayerDefault } from "./ChoroplethLayer";
export { MapControls, default as MapControlsDefault, MAP_STYLE_URLS } from "./MapControls";
export type { MapStyle } from "./MapControls";
export { CountryPopup, default as CountryPopupDefault } from "./CountryPopup";
export { MapLegend, default as MapLegendDefault } from "./MapLegend";
export { MapDataLegend } from "./MapDataLegend";
export type { CountryBPData } from "./ChoroplethLayer";

export {
  createMilitaryBudgetLayer,
  createNavyLayer,
  createAircraftLayer,
  createNukeLayer,
  createTankLayer,
} from "./AnalyticsLayers";

export { LayerSelector, default as LayerSelectorDefault } from "./LayerSelector";
export type { AnalyticsLayerKey } from "./LayerSelector";
export type { AnalyticsLayerKey as MapAnalyticsLayerKey, CountryMapData } from "./map-types";
