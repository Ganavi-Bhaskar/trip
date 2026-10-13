export const quotes = [
  'New place, same crazy us!',
  'Sun, sand and us.',
  'Making memories, one stop at a time.',
  'Adventure is better together.',
  'Last day, best day!',
]

export function quoteForDay(day: number): string {
  return quotes[(day - 1) % quotes.length] ?? quotes[0] ?? 'Adventure is better together.'
}