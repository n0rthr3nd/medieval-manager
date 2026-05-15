import { Injectable, signal } from '@angular/core';

export type SttErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'aborted'
  | 'network'
  | 'unknown';

const DEFAULT_LANG = 'es-ES';

/**
 * Encapsula la Web Speech API del navegador para dictado (STT) y lectura (TTS).
 *
 * En Chrome/Edge, SpeechRecognition delega el reconocimiento en los servidores
 * de Google; speechSynthesis usa las voces del SO. Si el navegador no implementa
 * alguna de las APIs, los flags `sttSupported` / `ttsSupported` quedan a false
 * y los consumidores deben ocultar el botón correspondiente.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly sttSupported = signal<boolean>(false);
  readonly ttsSupported = signal<boolean>(false);

  readonly isListening = signal<boolean>(false);
  readonly interimTranscript = signal<string>('');
  readonly finalTranscript = signal<string>('');
  readonly sttError = signal<SttErrorCode | null>(null);

  readonly speakingId = signal<string | null>(null);

  private recognition: SpeechRecognition | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.sttSupported.set(!!SpeechRecognitionCtor);
    this.ttsSupported.set(
      typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        'SpeechSynthesisUtterance' in window,
    );
  }

  startListening(lang: string = DEFAULT_LANG): void {
    if (!this.sttSupported() || this.isListening()) return;

    const recognition = this.getOrCreateRecognition();
    if (!recognition) return;

    recognition.lang = lang;
    this.interimTranscript.set('');
    this.finalTranscript.set('');
    this.sttError.set(null);

    try {
      recognition.start();
      this.isListening.set(true);
    } catch {
      this.sttError.set('unknown');
      this.isListening.set(false);
    }
  }

  stopListening(): void {
    if (!this.recognition || !this.isListening()) return;
    try {
      this.recognition.stop();
    } catch {
      /* ignore */
    }
  }

  abortListening(): void {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch {
      /* ignore */
    }
    this.isListening.set(false);
    this.interimTranscript.set('');
    this.finalTranscript.set('');
  }

  toggleListening(lang: string = DEFAULT_LANG): void {
    if (this.isListening()) {
      this.stopListening();
    } else {
      this.startListening(lang);
    }
  }

  speak(id: string, text: string, lang: string = DEFAULT_LANG): void {
    if (!this.ttsSupported() || !text) return;

    if (this.isListening()) {
      this.stopListening();
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = () => {
      if (this.speakingId() === id) this.speakingId.set(null);
      this.currentUtterance = null;
    };
    utterance.onerror = () => {
      if (this.speakingId() === id) this.speakingId.set(null);
      this.currentUtterance = null;
    };

    this.currentUtterance = utterance;
    this.speakingId.set(id);
    window.speechSynthesis.speak(utterance);
  }

  cancelSpeech(): void {
    if (!this.ttsSupported()) return;
    window.speechSynthesis.cancel();
    this.speakingId.set(null);
    this.currentUtterance = null;
  }

  toggleSpeak(id: string, text: string, lang: string = DEFAULT_LANG): void {
    if (this.speakingId() === id) {
      this.cancelSpeech();
    } else {
      this.speak(id, text, lang);
    }
  }

  private getOrCreateRecognition(): SpeechRecognition | null {
    if (this.recognition) return this.recognition;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;

    const recognition: SpeechRecognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalDelta = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalDelta += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalDelta) {
        this.finalTranscript.update(prev => prev + finalDelta);
      }
      this.interimTranscript.set(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = (event.error as SttErrorCode) || 'unknown';
      this.sttError.set(code);
      this.isListening.set(false);
    };

    recognition.onend = () => {
      this.isListening.set(false);
      this.interimTranscript.set('');
    };

    this.recognition = recognition;
    return recognition;
  }
}
