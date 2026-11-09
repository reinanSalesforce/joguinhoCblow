import { findChampion } from './draft'

export function champName(idOrName: string): string {
  return findChampion(idOrName)?.name ?? idOrName
}
