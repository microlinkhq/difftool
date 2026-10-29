"use client"

import { useRef, useState } from "react"
import { Leva, button, folder, useControls } from "leva"
import {
  COLOR_GROUPS,
  COLOR_TOKENS,
  type ColorToken,
  type TokenValues,
  cssVariable,
  overridesCss,
  toHex,
} from "@/lib/color-debug"

const readTokens = (): TokenValues => {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(COLOR_TOKENS.map((token) => [token, toHex(style.getPropertyValue(cssVariable(token)))]))
}

const applyToken = (token: ColorToken, value: string, initial: TokenValues) => {
  const { style } = document.documentElement
  if (toHex(value) === initial[token]) style.removeProperty(cssVariable(token))
  else style.setProperty(cssVariable(token), value)
}

export function ColorDebugPanel() {
  const [initial] = useState(readTokens)
  const current = useRef<TokenValues>({ ...initial })

  const tokenControl = (token: ColorToken) => ({
    value: initial[token] ?? "#000000",
    onChange: (value: string) => {
      current.current[token] = value
      applyToken(token, value, initial)
    },
  })

  const groups = Object.fromEntries(
    Object.entries(COLOR_GROUPS).map(([name, tokens]) => [
      name,
      folder(Object.fromEntries(tokens.map((token) => [token, tokenControl(token)])), { collapsed: name !== "Accent" }),
    ])
  )

  const [, set] = useControls(() => ({
    ...groups,
    "Copy CSS": button(() => navigator.clipboard.writeText(overridesCss(initial, current.current))),
    Reset: button(() => set(initial as Record<string, string>)),
  }))

  return (
    <div className="fixed bottom-16 left-4 z-[1000] max-h-[80vh] w-[300px] overflow-auto rounded-[10px]">
      <Leva fill collapsed titleBar={{ title: "Colors", drag: false }} />
    </div>
  )
}
