import { fillTextField } from './textFiller.js'

const MONTH_NAMES: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

function normalizeDate(value: string): string {
  // YYYY-MM-DD → MM/DD/YYYY
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
  }

  // "Month YYYY" → MM/01/YYYY
  const monthYearMatch = value.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (monthYearMatch) {
    const month = MONTH_NAMES[monthYearMatch[1]!.toLowerCase()]
    if (month) {
      return `${month}/01/${monthYearMatch[2]!}`
    }
  }

  return value
}

export async function fillDateField(element: HTMLInputElement, value: string): Promise<void> {
  await fillTextField(element, normalizeDate(value))
}
