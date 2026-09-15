export interface DemoScenario {
  id: "SCENARIO-POOL-GATE" | "SCENARIO-IRRIGATION" | "SCENARIO-TRAIL-LIGHT";
  label: string;
  residentId: string;
  residentName: string;
  submittedLocation: string;
  residentNote: string;
  imageFile: string;
  expectedAssetId: string;
  primary: boolean;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "SCENARIO-POOL-GATE",
    label: "Keynote sample — pool gate",
    residentId: "RES-001",
    residentName: "Avery Martin",
    submittedLocation: "East Pool Entrance",
    residentNote:
      "The east pool gate won't latch and keeps swinging open. I tried closing it twice.",
    imageFile: "pool-gate-broken.jpg",
    expectedAssetId: "PG-002",
    primary: true,
  },
  {
    id: "SCENARIO-IRRIGATION",
    label: "Alternate — irrigation leak",
    residentId: "RES-002",
    residentName: "Jordan Lee",
    submittedLocation: "Greenway near Lot 42",
    residentNote:
      "Water has been running across the walking path near Lot 42 for about 20 minutes.",
    imageFile: "irrigation-leak.jpg",
    expectedAssetId: "IRR-014",
    primary: false,
  },
  {
    id: "SCENARIO-TRAIL-LIGHT",
    label: "Alternate — trail light out",
    residentId: "RES-002",
    residentName: "Jordan Lee",
    submittedLocation: "East Walking Trail",
    residentNote: "The light at the east trail intersection has been out for two nights.",
    imageFile: "trail-light.jpg",
    expectedAssetId: "LIGHT-009",
    primary: false,
  },
];

export const PRIMARY_SCENARIO = DEMO_SCENARIOS[0] as DemoScenario;

export const ALLOWED_SAMPLE_IMAGES = DEMO_SCENARIOS.map((scenario) => scenario.imageFile);

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}
