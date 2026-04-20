// ============================================================================
// Intent Service — NLU via Groq Llama
// Classifies a voice transcript into a structured intent.
//
// Usage (Step 4 — isolated test, not wired into app yet):
//   const intent = await intentService.classify(
//     "put it in my savings please",
//     "AccountSelect",
//     ["SELECT_CHECKING", "SELECT_SAVINGS", "CANCEL", "GO_BACK"]
//   );
//   // → { action: "SELECT_SAVINGS", entities: { accountType: "savings" }, confidence: 0.95, source: "llm" }
// ============================================================================

import { GROQ_API_KEY } from '@env';
import { VoiceIntent } from '@/types/index';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const CONFIDENCE_THRESHOLD = 0.5;

// --------------------------------------------------------------------------
// Fast-path table — single words / short fixed phrases that never need LLM.
// Resolved locally in <1ms. Add more as patterns emerge.
// --------------------------------------------------------------------------
const FAST_PATH: Record<string, string> = {
  // Confirmations
  yes: 'CONFIRM',
  yeah: 'CONFIRM',
  yep: 'CONFIRM',
  yup: 'CONFIRM',
  correct: 'CONFIRM',
  confirm: 'CONFIRM',
  sure: 'CONFIRM',
  ok: 'CONFIRM',
  okay: 'CONFIRM',
  right: 'CONFIRM',
  done: 'CONFIRM',
  ready: 'CONFIRM',
  proceed: 'CONFIRM',
  // Rejections
  no: 'CANCEL',
  nope: 'CANCEL',
  cancel: 'CANCEL',
  stop: 'CANCEL',
  // Navigation
  back: 'GO_BACK',
  // Help
  help: 'HELP',
  // Repeat
  repeat: 'REPEAT',
  again: 'REPEAT',
};

// Multi-word fast-path phrases (checked after single-word)
const FAST_PATH_PHRASES: Array<{ phrase: string; action: string }> = [
  { phrase: 'go back', action: 'GO_BACK' },
  { phrase: 'go ahead', action: 'CONFIRM' },
  { phrase: 'that is correct', action: 'CONFIRM' },
  { phrase: 'that is wrong', action: 'GO_BACK' },
  { phrase: 'say again', action: 'REPEAT' },
  { phrase: 'start over', action: 'CANCEL' },
];

// --------------------------------------------------------------------------
// System prompt — keep it tight so Llama returns clean JSON quickly
// --------------------------------------------------------------------------
const buildSystemPrompt = (screen: string, availableActions: string[]): string => `
You are a voice assistant for FinSight, a banking app for blind and low-vision users.
Classify the user's voice transcript into a structured intent.
Return ONLY valid JSON — no markdown fences, no explanation.

Schema:
{
  "action": string,
  "entities": object,
  "confidence": number
}

Current screen: ${screen}
Available actions: ${availableActions.join(', ')}

Rules:
- Pick the single best action from the available list, or UNKNOWN if none fit.
- For SET_AMOUNT: set entities.amount as a number (e.g. "one fifty" → 150.00, "twenty five dollars and fifty cents" → 25.50).
- For SELECT_CHECKING or SELECT_SAVINGS: set entities.accountType as "checking" or "savings".
- confidence is 0.0–1.0. Use < 0.5 only when genuinely ambiguous.
- Short affirmations (yes/okay/sure) → CONFIRM. Short negations (no/wrong) → CANCEL or GO_BACK based on context.
`.trim();

// --------------------------------------------------------------------------
// IntentService
// --------------------------------------------------------------------------
class IntentService {

  /**
   * Classify a voice transcript into a VoiceIntent.
   *
   * @param transcript  - Raw text from STT (Groq Whisper)
   * @param screen      - Current screen name e.g. "AccountSelect"
   * @param availableActions - Actions valid on this screen
   */
  async classify(
    transcript: string,
    screen: string,
    availableActions: string[]
  ): Promise<VoiceIntent> {
    const normalized = transcript.toLowerCase().trim();

    // ── Fast path ──────────────────────────────────────────────────────────
    const fastResult = this.fastPath(normalized);
    if (fastResult) {
      console.log(`[Intent] Fast-path: "${normalized}" → ${fastResult}`);
      return {
        action: fastResult,
        entities: {},
        confidence: 1.0,
        source: 'fast-path',
      };
    }

    // ── Groq Llama ─────────────────────────────────────────────────────────
    return this.callGroq(normalized, screen, availableActions);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private fastPath(normalized: string): string | null {
    // Single-word lookup
    if (FAST_PATH[normalized]) {
      return FAST_PATH[normalized];
    }

    // Multi-word phrase lookup
    for (const { phrase, action } of FAST_PATH_PHRASES) {
      if (normalized === phrase) return action;
    }

    return null;
  }

  private async callGroq(
    transcript: string,
    screen: string,
    availableActions: string[]
  ): Promise<VoiceIntent> {
    const start = Date.now();
    console.log(`[Intent] Sending to Groq Llama: "${transcript}"`);

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(screen, availableActions),
          },
          {
            role: 'user',
            content: `Transcript: "${transcript}"`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[Intent] Groq ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) throw new Error('[Intent] Empty response from Groq');

    const parsed = JSON.parse(raw) as { action: string; entities: Record<string, unknown>; confidence: number };
    const latency = Date.now() - start;

    console.log(`[Intent] Groq result (${latency}ms):`, JSON.stringify(parsed));

    // Guard: if confidence too low, return UNKNOWN so caller can ask user to repeat
    if (parsed.confidence < CONFIDENCE_THRESHOLD) {
      return {
        action: 'UNKNOWN',
        entities: parsed.entities ?? {},
        confidence: parsed.confidence,
        source: 'llm',
      };
    }

    return {
      action: parsed.action,
      entities: parsed.entities ?? {},
      confidence: parsed.confidence,
      source: 'llm',
    };
  }
}

export default new IntentService();
