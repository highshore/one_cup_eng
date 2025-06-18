# Transcript Page

This transcript page provides real-time speech-to-text transcription using the Speechmatics API.

## Features

- Real-time audio transcription using Speechmatics
- **Speaker Diarization** - Automatically identifies and separates different speakers
- **Confidence Scoring** - Words with confidence < 70% are highlighted in red
- Live microphone input processing with proper word spacing
- Partial and final transcript display with speaker identification
- Target sentence input (optional) for practice
- Connection status indicators
- Color-coded speaker visualization
- Visual confidence indicators for transcription accuracy
- Error handling and user feedback

## Setup

### 1. Environment Variables

Add your Speechmatics API key to your environment variables:

```bash
NEXT_PUBLIC_SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
```

### 2. Microphone Permissions

The page will automatically request microphone permissions when loaded. Users need to grant microphone access for the transcription to work.

## Usage

1. Navigate to `/transcript`
2. (Optional) Enter a target sentence you want to practice
3. Click "Start Recording" to begin transcription
4. Speak into your microphone
5. View the live transcript with partial (gray, italic) and final (black, bold) text
6. Click "Stop Recording" to end the session

## Technical Details

### Audio Processing

- Uses Web Audio API with AudioContext
- Processes audio at 16kHz sample rate in PCM float32 little-endian format
- Audio is processed through an AudioWorkletNode using `/scripts/audio-processor.js`

### Speechmatics Integration

- Fetches JWT tokens from Speechmatics API for authentication
- Establishes WebSocket connection for real-time transcription
- Handles partial and final transcript events
- Includes disfluency removal and enhanced operating point
- **Speaker Diarization** with up to 5 speakers maximum
- Color-coded speaker identification (S1, S2, S3, S4, S5, UU for unknown)

### Components

- `TranscriptClient.tsx` - Main client component with UI and audio handling
- `hooks/useSpeechmatics.ts` - Custom React hook for Speechmatics integration
- `page.tsx` - Next.js page wrapper

## Error Handling

The page handles various error scenarios:
- Missing API key
- Microphone permission denied
- WebSocket connection errors
- Audio processing errors
- Speechmatics API errors

All errors are displayed to the user with helpful messages. 