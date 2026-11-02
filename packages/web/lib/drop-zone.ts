export const leavesZone = (zone: { contains: (node: Node | null) => boolean }, next: EventTarget | null) =>
  !next || !zone.contains(next as Node)
