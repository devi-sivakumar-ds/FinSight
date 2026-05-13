# FinSight

FinSight is a voice-first mobile banking prototype designed for blind and low-vision users. The app focuses on one high-friction banking task: depositing a paper check with guided speech, clear confirmations, and accessible recovery paths.

The prototype is built with React Native and Expo. It includes a mobile app for participants and a Wizard of Oz dashboard for study operators.

## Try It

Add your public links here before sharing the repository:

- Android APK: [FinSight Prototype APK](https://drive.google.com/file/d/1sen2EGkLq0ymP_IWj-pMOBSmqf2TZSO8/view?usp=sharing)
- Wizard dashboard: [Wizard of Oz Dashboard](https://finsight-4c4d.onrender.com)

The APK is for trying the participant-facing mobile app. The dashboard is for the operator who controls the Wizard of Oz study session.

## What The App Does

FinSight walks a user through a mock mobile check deposit flow. The app is designed around spoken interaction rather than visual-first navigation, so the user can hear what is happening, respond naturally, and receive confirmation before important actions.

The main flow includes:

- Opening the check deposit task from the home screen
- Hearing an overview of the deposit process
- Reviewing privacy and safety guidance
- Choosing a checking or savings account
- Preparing the check for capture
- Capturing the front and back of the check
- Simulating OCR and check detail review
- Confirming the final deposit
- Reaching a success or recovery screen

The app also includes settings for voice verbosity and speaking pace. These settings are important because users may want shorter prompts once they understand the flow, or slower speech when they are learning a new task.

## Why Wizard Of Oz Mode Exists

FinSight was originally explored as a more autonomous assistant. That version combined speech recognition, intent classification, text-to-speech, camera guidance, OCR-style extraction, haptics, navigation logic, and a mock banking API.

That direction was useful technically, but it introduced too many points of uncertainty for an early user study. A spoken phrase such as "yes," "go back," or "start over" can mean different things depending on the current screen. Camera guidance also depends on real-world conditions like lighting, glare, check design, desk surface, hand motion, and focus. When all of these systems are stacked together, a failure in one layer can interrupt the entire experience.

For this research stage, the important question is not whether every automation system is production-ready. The important question is whether the interaction design feels clear, safe, and trustworthy for blind and low-vision users. Wizard of Oz mode lets the team study that experience while keeping the riskiest decisions under human control.

## How Wizard Of Oz Mode Works

In Wizard of Oz mode, the participant still uses the real FinSight mobile app. The app displays screens, speaks prompts, plays feedback, updates state, and moves through the deposit flow.

The simulated part is the decision layer. A human operator uses a laptop dashboard to decide what the assistant should do next. The operator listens to the participant, watches the session state, and sends structured commands to the app.

Example operator commands include:

- Open the deposit flow
- Select checking or savings
- Repeat the current prompt
- Give capture guidance such as move left, move right, hold steady, or improve lighting
- Mark the front or back of the check as captured
- Simulate OCR success, partial success, or failure
- Speak a post-capture summary
- Confirm or cancel the deposit
- Return home or recover from an error

This means the participant can experience FinSight as an intelligent voice-guided assistant, while the study team avoids false failures caused by unfinished speech, camera, or OCR automation.

## System Architecture

The prototype has two main pieces:

- Mobile app: the participant-facing React Native app.
- Wizard dashboard and server: a Node/WebSocket dashboard used by the operator.

The app owns the user experience. It controls navigation, text-to-speech, haptics, capture screens, confirmation screens, settings, and success or error states.

The dashboard owns the study control layer. It sends commands, displays the latest app state, shows an event log, supports operator notes, and writes local session logs.

The two sides communicate with structured WebSocket messages:

- The app sends session info, state updates, and log events.
- The dashboard sends operator commands.
- The server relays messages between app and dashboard clients.
- Session activity is saved under `wizard-dashboard/logs/`.

## State Synchronization

Wizard of Oz studies can fail if the operator and app drift out of sync. FinSight reduces that risk by having the app continuously report structured state back to the dashboard.

The reported state includes:

- Current screen and navigation context
- Selected account
- Deposit amount and reviewed summary text
- Current capture side
- Front and back capture progress
- OCR outcome
- Last command received
- Voice settings
- Session ID and timestamps

This feedback loop helps the operator confirm that commands had the intended effect and recover quickly if the participant reaches an unexpected state.

## Local Development

Install dependencies:

```sh
npm install
```

Start the Expo development server:

```sh
npm start
```

Run the Android app:

```sh
npm run android
```

Run checks:

```sh
npm run type-check
npm run lint
```

## Running The Wizard Dashboard Locally

Start the dashboard/server:

```sh
npm run wizard:dashboard
```

Then open:

```txt
http://localhost:7007
```

For an Android phone connected over USB, apply the reverse port mappings:

```sh
npm run wizard:android-usb
```

That script forwards the Metro development server and the local Wizard dashboard port to the phone:

- `8081` for Metro
- `7007` for the Wizard dashboard/server

After that, run the app on the connected device and keep the dashboard open on the operator laptop.

## Study Mode

The current study mode is configured in:

```txt
src/config/studyMode.ts
```

At this stage, the app defaults to `pure_woz`, meaning the dashboard controls the decision layer. This keeps live study sessions consistent and prevents unfinished automation from being mistaken for interaction design problems.

## Key Files

- `src/services/wizardClient.ts`: app-side WebSocket client for Wizard of Oz mode
- `src/services/wizardExecutor.ts`: maps operator commands to app behavior
- `src/services/wizardState.ts`: tracks app and deposit state for dashboard reporting
- `src/utils/wizardCommands.ts`: centralized command model used by the operator dashboard
- `src/types/wizard.ts`: shared Wizard of Oz message and state types
- `wizard-dashboard/server.js`: dashboard server, WebSocket relay, and session logger
- `wizard-dashboard/public/`: operator dashboard UI
- `scripts/wizard-android-usb.sh`: Android USB reverse port setup

## Research Purpose

FinSight is a research prototype, not a real banking product. It is designed to evaluate the interaction model for accessible mobile check deposit: spoken guidance, pacing, confirmation, error recovery, and trust-building moments.

The Wizard of Oz implementation helps separate the user experience question from the automation question. It lets the team learn what the assistant should say and do before investing more effort in making every subsystem autonomous.
