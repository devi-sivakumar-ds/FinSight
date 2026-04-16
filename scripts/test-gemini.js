// =============================================================================
// FinSight — Gemini + Google Cloud TTS API Key Smoke Test
// Run: GEMINI_API_KEY=your_key node scripts/test-gemini.js
// Run with TTS: GEMINI_API_KEY=xxx GOOGLE_TTS_API_KEY=yyy node scripts/test-gemini.js
//
// Tests:
//   1. Gemini 2.0 Flash — intent extraction (NLU)
//   2. Google Cloud TTS — text → audio (requires separate key from console.cloud.google.com)
//
// Keys:
//   GEMINI_API_KEY      → aistudio.google.com  (free tier, no credit card)
//   GOOGLE_TTS_API_KEY  → console.cloud.google.com → Cloud TTS API enabled
//                         (1M Neural chars/month free, separate from Gemini)
// =============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌  GEMINI_API_KEY not set.');
  console.error('    Usage: GEMINI_API_KEY=your_key node scripts/test-gemini.js');
  console.error('    Get a free key at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GOOGLE_TTS_BASE = 'https://texttospeech.googleapis.com/v1';

// --------------------------------------------------------------------------
// Test 1: Gemini Flash — Intent extraction (NLU layer)
// --------------------------------------------------------------------------
async function testGeminiIntent() {
  console.log('\n── Test 1: Gemini 2.0 Flash (NLU / intent extraction) ──');

  const SYSTEM_PROMPT = `You are a voice assistant for a banking app called FinSight, designed for blind and low-vision users.
Extract the user's intent from a voice transcript.
Return ONLY valid JSON — no markdown fences, no explanation.

Schema:
{
  "action": string,
  "entities": object,
  "confidence": number
}

Possible actions:
  SELECT_CHECKING, SELECT_SAVINGS,
  SET_AMOUNT,
  CONFIRM, CANCEL, GO_BACK, REPEAT, HELP,
  UNKNOWN`;

  const testCases = [
    {
      label: 'Natural account selection',
      screen: 'AccountSelect',
      transcript: 'I want to use my checking account please',
      expected: 'SELECT_CHECKING',
    },
    {
      label: 'Spoken dollar amount',
      screen: 'AmountInput',
      transcript: 'two hundred and fifty dollars',
      expected: 'SET_AMOUNT',
    },
    {
      label: 'Confirm deposit',
      screen: 'Confirmation',
      transcript: "looks good, let's do it",
      expected: 'CONFIRM',
    },
    {
      label: 'Mid-flow correction',
      screen: 'Confirmation',
      transcript: 'wait that amount is wrong',
      expected: 'GO_BACK',
    },
    {
      label: 'Ambiguous / low-confidence',
      screen: 'AccountSelect',
      transcript: 'umm I dunno',
      expected: 'UNKNOWN',
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const userMessage = `Screen: ${tc.screen}\nTranscript: "${tc.transcript}"`;
    const start = Date.now();

    try {
      const response = await fetch(
        `${GEMINI_BASE}/models/gemini-2.0-flash-lite-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 150,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const latency = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        console.error(`  ❌  [${tc.label}] HTTP ${response.status}: ${err}`);
        allPassed = false;
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.error(`  ❌  [${tc.label}] API error: ${JSON.stringify(data.error)}`);
        allPassed = false;
        continue;
      }

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        console.error(`  ❌  [${tc.label}] No content in response`);
        allPassed = false;
        continue;
      }

      const intent = JSON.parse(raw);
      const passed = intent.action === tc.expected;
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
// Test 2: Google Cloud TTS (optional — only if GOOGLE_TTS_API_KEY is set)
// --------------------------------------------------------------------------
async function testGoogleTTS() {
  console.log('\n── Test 2: Google Cloud Text-to-Speech ──');

  if (!GOOGLE_TTS_API_KEY) {
    console.log('  ⏭️   GOOGLE_TTS_API_KEY not set — skipping TTS test.');
    console.log('   To test: GOOGLE_TTS_API_KEY=your_key node scripts/test-gemini.js');
    console.log('   Get key: console.cloud.google.com → APIs & Services → Cloud TTS');
    console.log('   Note: This is a SEPARATE key from your Gemini (AI Studio) key.');
    return null; // null = skipped (not failed)
  }

  const start = Date.now();
  try {
    const response = await fetch(
      `${GOOGLE_TTS_BASE}/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 'Which account do you want to deposit to?' },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-F',
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    const latency = Date.now() - start;

    if (response.status === 401 || response.status === 403) {
      console.error('  ❌  TTS: Auth failed (HTTP', response.status, ')');
      console.error('       Make sure Cloud TTS API is enabled in your Google Cloud project.');
      const err = await response.text();
      console.error('      ', err.slice(0, 300));
      return false;
    }

    if (!response.ok) {
      const err = await response.text();
      console.error(`  ❌  TTS: HTTP ${response.status}: ${err.slice(0, 300)}`);
      return false;
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      console.error('  ❌  TTS: No audioContent in response');
      return false;
    }

    const audioSizeKB = Math.round((audioContent.length * 3) / 4 / 1024);
    console.log('  ✅  Google Cloud TTS working!');
    console.log(`       Voice   : en-US-Neural2-F`);
    console.log(`       Latency : ${latency}ms`);
    console.log(`       Audio   : ~${audioSizeKB}KB (base64 MP3)`);
    console.log('       On device: expo-av will play this audio buffer directly.');
    return true;
  } catch (err) {
    console.error('  ❌  TTS: Network error —', err.message);
    return false;
  }
}

// --------------------------------------------------------------------------
// Print note about key differences
// --------------------------------------------------------------------------
function printKeyNotes() {
  console.log('\n── Key Setup Notes ──');
  console.log('  GEMINI_API_KEY (AI Studio)');
  console.log('    • aistudio.google.com/app/apikey');
  console.log('    • Free tier: 1500 req/day on gemini-2.0-flash-lite');
  console.log('    • Used for: intent extraction (NLU)');
  console.log();
  console.log('  GOOGLE_TTS_API_KEY (Google Cloud)');
  console.log('    • console.cloud.google.com → APIs & Services → Credentials');
  console.log('    • Enable: Cloud Text-to-Speech API');
  console.log('    • Free tier: 1M Neural2 characters/month');
  console.log('    • Used for: natural voice TTS output');
  console.log('    • ⚠️  This is a DIFFERENT key from your AI Studio / Gemini key');
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
async function main() {
  console.log('=== FinSight — Gemini + Google Cloud TTS API Key Test ===');
  console.log(`Gemini key : ${GEMINI_API_KEY.slice(0, 8)}${'*'.repeat(20)}`);
  if (GOOGLE_TTS_API_KEY) {
    console.log(`TTS key    : ${GOOGLE_TTS_API_KEY.slice(0, 8)}${'*'.repeat(20)}`);
  } else {
    console.log('TTS key    : not set (TTS test will be skipped)');
  }

  const geminiOk = await testGeminiIntent();
  const ttsResult = await testGoogleTTS();
  printKeyNotes();

  console.log('\n── Summary ──');
  console.log(`  Gemini NLU       : ${geminiOk ? '✅ PASS' : '❌ FAIL'}`);
  if (ttsResult === null) {
    console.log('  Google Cloud TTS : ⏭️  SKIPPED (key not provided)');
  } else {
    console.log(`  Google Cloud TTS : ${ttsResult ? '✅ PASS' : '❌ FAIL'}`);
  }

  const ttsOk = ttsResult === null || ttsResult === true;

  if (geminiOk && ttsOk) {
    console.log('\n✅  All tests passed. Safe to proceed.\n');
    if (ttsResult === null) {
      console.log('   Reminder: Set GOOGLE_TTS_API_KEY before Step 2 (TTS engine swap).\n');
    }
  } else {
    console.log('\n❌  Some tests failed. Fix before proceeding.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
