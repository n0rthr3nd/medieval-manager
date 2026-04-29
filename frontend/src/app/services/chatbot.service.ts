import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ChatStreamEvent, ChatbotStatus } from '../models/chatbot.model';

/**
 * Cliente del chatbot.
 *
 * Usa fetch + ReadableStream en lugar de EventSource para poder enviar el
 * Authorization header (EventSource no lo soporta).
 *
 * Cada llamada a sendMessage devuelve un Subject que emite eventos hasta que
 * el stream termina (done/error/abort).
 */
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = environment.apiUrl;

  getStatus(): Observable<ChatbotStatus> {
    return this.http.get<ChatbotStatus>(`${this.apiUrl}/chat/status`);
  }

  getConversacion(): Observable<{ data: any | null }> {
    return this.http.get<{ data: any | null }>(`${this.apiUrl}/chat/conversacion`);
  }

  /**
   * Envía un mensaje y devuelve un Subject que emite ChatStreamEvent hasta
   * el cierre. El consumidor debe llamar a abort.next()/abort.complete() si
   * quiere cancelar antes de tiempo.
   */
  sendMessage(mensaje: string): {
    events$: Observable<ChatStreamEvent>;
    abort: () => void;
  } {
    const events$ = new Subject<ChatStreamEvent>();
    const controller = new AbortController();
    const token = this.authService.getToken();

    const run = async () => {
      try {
        const response = await fetch(`${this.apiUrl}/chat/mensaje`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            accept: 'text/event-stream',
          },
          body: JSON.stringify({ mensaje }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail: any = null;
          try { detail = await response.json(); } catch { /* ignore */ }
          events$.next({
            type: 'error',
            data: {
              message: detail?.message || `HTTP ${response.status}`,
              code: detail?.error || `http_${response.status}`,
            },
          });
          events$.complete();
          return;
        }

        if (!response.body) {
          events$.next({ type: 'error', data: { message: 'Respuesta vacía' } });
          events$.complete();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        const flush = () => {
          if (!currentEvent) return;
          try {
            const data = currentData ? JSON.parse(currentData) : {};
            events$.next({ type: currentEvent as any, data });
          } catch (err) {
            console.warn('chatbot: parse error', err, currentData);
          }
          currentEvent = '';
          currentData = '';
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIdx;
          while ((nlIdx = buffer.indexOf('\n')) >= 0) {
            const rawLine = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 1);
            const line = rawLine.replace(/\r$/, '');

            if (line === '') {
              flush();
              continue;
            }
            if (line.startsWith(':')) {
              continue; // comentario / heartbeat
            }
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const part = line.slice(5).trim();
              currentData = currentData ? `${currentData}\n${part}` : part;
            }
          }
        }
        // Por si el stream cierra sin doble newline final.
        flush();
        events$.complete();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          events$.complete();
          return;
        }
        events$.next({
          type: 'error',
          data: { message: err?.message || 'Error de red', code: 'network_error' },
        });
        events$.complete();
      }
    };

    run();

    return {
      events$: events$.asObservable(),
      abort: () => controller.abort(),
    };
  }

  async getStatusOnce(): Promise<ChatbotStatus | null> {
    try {
      return await firstValueFrom(this.getStatus());
    } catch {
      return null;
    }
  }
}
