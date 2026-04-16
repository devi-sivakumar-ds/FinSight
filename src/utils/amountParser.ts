// ============================================================================
// Voice Amount Parser
// Converts spoken amount strings into numeric dollar values
// ============================================================================

const ones: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const tens: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const scales: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
};

/**
 * Parse a spoken words-only sub-string into an integer.
 * e.g. "two hundred fifty three" → 253
 */
function parseWordNumber(words: string[]): number {
  let total = 0;
  let current = 0;

  for (const word of words) {
    if (ones[word] !== undefined) {
      current += ones[word];
    } else if (tens[word] !== undefined) {
      current += tens[word];
    } else if (word === 'hundred') {
      current = current === 0 ? 100 : current * 100;
    } else if (word === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    }
    // skip unknown words like "and", "dollars", "cents"
  }

  return total + current;
}

/**
 * Parse a voice transcription into a dollar amount.
 *
 * Supported formats:
 *   "one hundred fifty dollars"           → 150.00
 *   "one hundred fifty dollars and fifty cents" → 150.50
 *   "fifteen hundred"                     → 1500.00
 *   "one fifty"                           → 150.00
 *   "150.50"                              → 150.50
 *   "150 dollars 50 cents"               → 150.50
 *   "twenty five fifty"                   → 25.50 (ambiguous → treat last two-digit group as cents)
 *
 * Returns null if the input cannot be parsed.
 */
export function parseVoiceAmount(input: string): number | null {
  if (!input || !input.trim()) return null;

  const raw = input.toLowerCase().trim();

  // ── 1. Numeric string e.g. "150.50" or "150" ─────────────────────────────
  const numericMatch = raw.match(/^\$?\s*([\d,]+(?:\.\d{1,2})?)\s*$/);
  if (numericMatch) {
    const val = parseFloat(numericMatch[1].replace(',', ''));
    return isNaN(val) ? null : val;
  }

  // ── 2. Strip noise words ──────────────────────────────────────────────────
  const cleaned = raw
    .replace(/\$/g, '')
    .replace(/\band\b/g, '')
    .replace(/\bdollars?\b/g, 'DOLLARSEP')
    .replace(/\bcents?\b/g, 'CENTSEP')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ── 3. If we have explicit dollar / cent separators ───────────────────────
  if (cleaned.includes('DOLLARSEP') || cleaned.includes('CENTSEP')) {
    const [dollarPart, centPart] = cleaned.split('DOLLARSEP');
    const dollarWords = (dollarPart || '').trim().split(' ').filter(Boolean);
    const dollarVal = dollarWords.length ? parseWordNumber(dollarWords) : 0;

    let centVal = 0;
    if (centPart) {
      const centWords = centPart.replace('CENTSEP', '').trim().split(' ').filter(Boolean);
      if (centWords.length) {
        // cents can be spoken as digits "50" or words "fifty"
        const asNum = Number(centWords[0]);
        centVal = isNaN(asNum) ? parseWordNumber(centWords) : asNum;
      }
    }

    const result = dollarVal + centVal / 100;
    return result > 0 ? result : null;
  }

  // ── 4. Purely digit strings mixed in words e.g. "150 50" ─────────────────
  const digitMatch = cleaned.match(/^(\d+)\s+(\d{2})$/);
  if (digitMatch) {
    return parseFloat(`${digitMatch[1]}.${digitMatch[2]}`);
  }

  const singleDigit = cleaned.match(/^(\d+)$/);
  if (singleDigit) {
    return parseFloat(singleDigit[1]);
  }

  // ── 5. All-words input ────────────────────────────────────────────────────
  const words = cleaned.split(' ').filter(Boolean);

  // Heuristic: if last word is a two-digit-equivalent and preceding group
  // also forms a number, treat last as cents.
  // e.g. "twenty five fifty" → 25 dollars 50 cents
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    const lastVal = ones[lastWord] ?? tens[lastWord];

    if (lastVal !== undefined && lastVal <= 99 && lastVal >= 1) {
      const remainingWords = words.slice(0, -1);
      // Check remaining makes a valid number
      const dollarVal = parseWordNumber(remainingWords);
      if (dollarVal > 0) {
        // Ambiguous: could be 25.50 (twenty five dollars, fifty cents)
        // We only treat as cents if the last word is a "tens" word (20,30…90)
        // or a nice round number, to avoid misreading "one fifty" as 1.50
        if (tens[lastWord] !== undefined) {
          return dollarVal + lastVal / 100;
        }
      }
    }

    // Default: entire phrase = dollars, no cents
    const val = parseWordNumber(words);
    return val > 0 ? val : null;
  }

  const val = parseWordNumber(words);
  return val > 0 ? val : null;
}

/**
 * Format a numeric amount back to a human-readable speech string.
 * e.g. 150.50 → "150 dollars and 50 cents"
 */
export function formatAmountForSpeech(amount: number): string {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);

  if (cents === 0) {
    return `${dollars.toLocaleString()} dollar${dollars !== 1 ? 's' : ''}`;
  }
  return `${dollars.toLocaleString()} dollar${dollars !== 1 ? 's' : ''} and ${cents} cent${cents !== 1 ? 's' : ''}`;
}

/**
 * Format a numeric amount as display currency string.
 * e.g. 150.5 → "$150.50"
 */
export function formatAmountDisplay(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
