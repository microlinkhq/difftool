export const readDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })

export const canDisplay = (src: string) =>
  new Promise<boolean>((resolve) => {
    const image = new window.Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = src
  })

const FETCH_TIMEOUT_MS = 30_000

export async function fetchDisplayableImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Fetching ${url} failed with ${response.status}`)
  const dataUrl = await readDataUrl(await response.blob())
  if (!(await canDisplay(dataUrl))) throw new Error(`${url} is not a displayable image`)
  return dataUrl
}

export const fileNameFromUrl = (url: string) => url.split("?")[0].split("/").pop() || "URL Image"
