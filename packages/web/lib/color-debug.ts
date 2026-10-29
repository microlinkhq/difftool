export const COLOR_GROUPS = {
  Accent: ["primary", "primary-foreground", "brand"],
  Surfaces: ["background", "card", "muted", "border", "input"],
  Text: ["foreground", "muted-foreground", "link", "link-hover"],
  Status: ["destructive", "success"],
  Panels: ["ink-panel", "ink-panel-raised", "ink-panel-foreground", "ink-panel-muted"],
  Code: ["code-plain", "code-punctuation", "code-value"],
} as const

export type ColorToken = (typeof COLOR_GROUPS)[keyof typeof COLOR_GROUPS][number]
export type TokenValues = Partial<Record<ColorToken, string>>

export const COLOR_TOKENS = Object.values(COLOR_GROUPS).flat() as ColorToken[]

export const cssVariable = (token: ColorToken) => `--${token}`

export const toHex = (value: string) => {
  const hex = value.trim().toLowerCase()
  const short = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : hex
}

export const changedTokens = (initial: TokenValues, current: TokenValues) =>
  COLOR_TOKENS.filter((token) => current[token] !== undefined && toHex(current[token]) !== toHex(initial[token] ?? ""))

export const overridesCss = (initial: TokenValues, current: TokenValues) => {
  const changed = changedTokens(initial, current)
  if (changed.length === 0) return ""
  const lines = changed.map((token) => `  ${cssVariable(token)}: ${toHex(current[token]!)};`)
  return [":root {", ...lines, "}", ""].join("\n")
}
