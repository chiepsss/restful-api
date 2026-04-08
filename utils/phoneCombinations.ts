const DIGIT_LETTER_MAP: Record<string, string> = {
  '2': 'abc',
  '3': 'def',
  '4': 'ghi',
  '5': 'jkl',
  '6': 'mno',
  '7': 'pqrs',
  '8': 'tuv',
  '9': 'wxyz',
};

export function getPhoneCombinations(digits: string): string[] {
  if (!digits) return [];

  let result: string[] = [''];

  for (const digit of digits) {
    const mappedLetters = DIGIT_LETTER_MAP[digit];
    const expanded: string[] = [];

    for (const existing of result) {
      for (const char of mappedLetters) {
        expanded.push(existing + char);
      }
    }

    result = expanded;
  }

  return result;
}