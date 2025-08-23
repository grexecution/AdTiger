export interface Style {
  name: "default" | "new-york"
  label: string
}

export const styles: Style[] = [
  {
    name: "default",
    label: "Default",
  },
  {
    name: "new-york",
    label: "New York",
  },
]