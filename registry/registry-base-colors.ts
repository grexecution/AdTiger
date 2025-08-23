export interface BaseColor {
  name: "slate" | "gray" | "zinc" | "neutral" | "stone"
  label: string
}

export const baseColors: BaseColor[] = [
  {
    name: "slate",
    label: "Slate",
  },
  {
    name: "gray",
    label: "Gray",
  },
  {
    name: "zinc",
    label: "Zinc",
  },
  {
    name: "neutral",
    label: "Neutral",
  },
  {
    name: "stone",
    label: "Stone",
  },
]