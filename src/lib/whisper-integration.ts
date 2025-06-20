import { File } from 'node:buffer';
import OpenAI from 'openai';
import { createReadStream, ReadStream } from 'fs';
import { TranscriptionResult } from '@/types/voice';

// Polyfill for Node.js versions older than 20
if (typeof globalThis.File === 'undefined') {
  globalThis.File = File as any;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Transcribes an audio file using the OpenAI Whisper API.
 * Implements a retry mechanism for robustness.
 *
 * @param {string} filePath - The local path to the audio file.
 * @returns {Promise<TranscriptionResult>} The transcription result.
 * @throws {Error} If transcription fails after all retries.
 */
export async function transcribeAudioWithWhisper(filePath: string): Promise<TranscriptionResult> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`Transcription attempt ${attempt} for file: ${filePath}`);

      const response = await openai.audio.transcriptions.create({
        file: createReadStream(filePath) as any, // Cast to any to satisfy type, as fs.ReadStream is compatible
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`Transcription successful in ${processingTime}ms`);

      // Adapt the Whisper API response to our internal TranscriptionResult type
      return {
        text: response.text,
        confidence: 0, // Note: Whisper verbose_json doesn't provide a single confidence score
        language: response.language,
        segments: response.segments?.map(s => ({
          text: s.text,
          start: s.start,
          end: s.end,
          confidence: s.avg_logprob, // Using avg_logprob as a stand-in for segment confidence
        })) || [],
        processingTime,
      };

    } catch (error) {
      lastError = error;
      console.error(`Transcription attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('Failed to transcribe audio after all retries.');
  throw new Error(`Whisper API transcription failed: ${lastError.message}`);
} 