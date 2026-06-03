import type { FieldMapping } from '@workday-ai/shared'

const CONFIDENCE_THRESHOLD = 0.6

export function splitByConfidence(mappings: FieldMapping[]): {
  autoFill: FieldMapping[]
  needsReview: FieldMapping[]
} {
  const autoFill: FieldMapping[] = []
  const needsReview: FieldMapping[] = []

  for (const mapping of mappings) {
    if (mapping.needsReview || mapping.confidence < CONFIDENCE_THRESHOLD) {
      needsReview.push(mapping)
    } else {
      autoFill.push(mapping)
    }
  }

  return { autoFill, needsReview }
}
