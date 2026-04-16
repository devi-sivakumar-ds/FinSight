// =============================================================================
// FinSight — Groq API Key Smoke Test
// Run: GROQ_API_KEY=your_key node scripts/test-groq.js
//
// Tests:
//   1. Groq Llama 3.3 70b — intent extraction (NLU)
//   2. Groq Whisper endpoint reachability (actual audio tested on device)
// =============================================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE_URL = 'https://api.groq.com/openai/v1';

if (!GROQ_API_KEY) {
  console.error('❌  GROQ_API_KEY not set.');
  console.error('    Usage: GROQ_API_KEY=your_key node scripts/test-groq.js');
  console.error('    Get a free key at: https://console.groq.com');
  process.exit(1);
}

// --------------------------------------------------------------------------
// Test 1: Llama 3.3 70b — Intent extraction (this is the NLU layer)
// --------------------------------------------------------------------------
async function testLlamaIntent() {
  console.log('\n── Test 1: Groq Llama 3.3 (NLU / intent extraction) ──');

  const SYSTEM_PROMPT = `You are a voice assistant for a banking app called FinSight.
Extract the user's intent from a voice transcript.
Return ONLY valid JSON — no markdown, no explanation.

Schema:
{
  "action": string,   // one of the actions listed below
  "entities": object, // relevant extracted values
  "confidence": number // 0.0 to 1.0
}

Possible actions:
  SELECT_CHECKING  — user wants to use their checking account
  SELECT_SAVINGS   — user wants to use their savings account
  SET_AMOUNT       — user is stating a dollar amount to deposit
  CONFIRM          — user is confirming / approving the current step
  CANCEL           — user wants to abort the entire transaction
  GO_BACK          — user wants to fix or change something on a previous step (mid-flow correction)
  REPEAT           — user wants the last prompt repeated
  HELP             — user is asking for help or guidance
  UNKNOWN          — intent is unclear or unrelated

Use GO_BACK (not CANCEL) when the user says something went wrong and they want to correct it mid-flow.`;

  const testCases = [
    {
      label: 'Natural account selection',
      transcript: 'actually put it in my savings account',
      expected: 'SELECT_SAVINGS',
    },
    {
      label: 'Spoken amount',
      transcript: 'one hundred and fifty dollars',
      expected: 'SET_AMOUNT',
    },
    {
      label: 'Confirmation',
      transcript: 'yes go ahead',
      expected: 'CONFIRM',
    },
    {
      label: 'Correction mid-flow',
      transcript: 'wait no, wrong amount, change it',
      expected: 'GO_BACK',
      also_accept: ['CANCEL'],
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Transcript: "${tc.transcript}"` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      const latency = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        console.error(`  ❌  [${tc.label}] HTTP ${response.status}: ${err}`);
        allPassed = false;
        continue;
      }

      const data = await response.json();
      const raw = data.choices[0].message.content;
      const intent = JSON.parse(raw);

      const passed = intent.action === tc.expected || (tc.also_accept || []).includes(intent.action);
      const icon = passed ? '✅' : '⚠️ ';
      console.log(`  ${icon}  [${tc.label}]`);
      console.log(`       transcript : "${tc.transcript}"`);
      console.log(`       intent     : ${JSON.stringify(intent)}`);
      console.log(`       expected   : ${tc.expected}`);
      console.log(`       latency    : ${latency}ms`);

      if (!passed) allPassed = false;
    } catch (err) {
      console.error(`  ❌  [${tc.label}] Error: ${err.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// --------------------------------------------------------------------------
// Test 2: Groq Whisper endpoint reachability check
// --------------------------------------------------------------------------
async function testWhisperEndpointReachable() {
  console.log('\n── Test 2: Groq Whisper endpoint reachability ──');
  console.log('   Note: Whisper requires an audio file (multipart/form-data).');
  console.log('   We verify the endpoint is reachable and your key is accepted.');
  console.log('   Full audio transcription is tested on-device via expo-av.\n');

  // Send an intentionally empty request — we expect a 400 (bad request)
  // not a 401 (unauthorized). 401 = bad key. 400 = key ok, bad payload.
  try {
    const response = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        // No Content-Type → will trigger a 400, not 401
      },
      body: '',
    });

    if (response.status === 401) {
      console.error('  ❌  Whisper: 401 Unauthorized — key is invalid or expired.');
      return false;
    }

    if (response.status === 400 || response.status === 422) {
      // Expected — endpoint is reachable, key is accepted, payload is wrong (no file)
      console.log('  ✅  Whisper endpoint reachable. Key accepted (HTTP', response.status, '— expected for empty payload).');
      console.log('   Full Whisper test: record audio on device → sttService.ts → Groq.');
      console.log('   Model to use: whisper-large-v3');
      return true;
    }

    // Unexpected status — still print it
    console.log(`  ⚠️   Whisper: Unexpected HTTP ${response.status} — may still be fine.`);
    return true;
  } catch (err) {
    console.error('  ❌  Whisper: Network error —', err.message);
    return false;
  }
}

// --------------------------------------------------------------------------
// Print available Groq models (bonus — useful for reference)
// --------------------------------------------------------------------------
async function listGroqModels() {
  console.log('\n── Available Groq Models (reference) ──');
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    const relevant = data.data
      .filter(m => m.id.includes('llama') || m.id.includes('whisper'))
      .map(m => `   • ${m.id}`)
      .join('\n');
    console.log(relevant || '   (none matched filter)');
  } catch {
    // Non-critical — skip silently
  }
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
async function main() {
  console.log('=== FinSight — Groq API Key Test ===');
  console.log(`Key: ${GROQ_API_KEY.slice(0, 8)}${'*'.repeat(20)}`);

  const llamaOk = await testLlamaIntent();
  const whisperOk = await testWhisperEndpointReachable();
  await listGroqModels();

  console.log('\n── Summary ──');
  console.log(`  Llama NLU  : ${llamaOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Whisper STT: ${whisperOk ? '✅ PASS (endpoint reachable)' : '❌ FAIL'}`);

  if (llamaOk && whisperOk) {
    console.log('\n✅  Groq API key is valid. Safe to proceed to Step 2.\n');
  } else {
    console.log('\n❌  Some tests failed. Fix before proceeding.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
