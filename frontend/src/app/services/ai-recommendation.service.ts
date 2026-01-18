import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  AIApiResponse,
  AIRecommendationResponse,
  SolicitarRecomendacionRequest,
  AceptarRecomendacionRequest,
  FeedbackRecomendacionRequest,
  ConversacionChat,
  MensajeChat,
} from '../models/ai-recommendation.model';
import { Bocadillo } from '../models/bocadillo.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiRecommendationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Estado de la conversación activa
  private conversacionActiva$ = new BehaviorSubject<ConversacionChat | null>(null);
  private cargandoRecomendacion$ = new BehaviorSubject<boolean>(false);

  /**
   * Observable de la conversación activa
   */
  get conversacion$(): Observable<ConversacionChat | null> {
    return this.conversacionActiva$.asObservable();
  }

  /**
   * Observable del estado de carga
   */
  get cargando$(): Observable<boolean> {
    return this.cargandoRecomendacion$.asObservable();
  }

  /**
   * Solicita una recomendación inteligente
   */
  solicitarRecomendacion(
    mensajeUsuario: string
  ): Observable<AIApiResponse<AIRecommendationResponse>> {
    this.cargandoRecomendacion$.next(true);

    const request: SolicitarRecomendacionRequest = { mensajeUsuario };

    return this.http
      .post<AIApiResponse<AIRecommendationResponse>>(
        `${this.apiUrl}/ai-recommendations/solicitar`,
        request
      )
      .pipe(
        tap({
          next: () => {
            this.cargandoRecomendacion$.next(false);
            // Recargar conversación después de obtener recomendación
            this.obtenerConversacion().subscribe();
          },
          error: () => {
            this.cargandoRecomendacion$.next(false);
          },
        })
      );
  }

  /**
   * Acepta una recomendación y crea el bocadillo automáticamente
   */
  aceptarRecomendacion(
    request: AceptarRecomendacionRequest
  ): Observable<AIApiResponse<Bocadillo>> {
    return this.http
      .post<AIApiResponse<Bocadillo>>(
        `${this.apiUrl}/ai-recommendations/aceptar`,
        request
      )
      .pipe(
        tap(() => {
          // Recargar conversación después de aceptar
          this.obtenerConversacion().subscribe();
        })
      );
  }

  /**
   * Envía feedback sobre una recomendación
   */
  enviarFeedback(
    request: FeedbackRecomendacionRequest
  ): Observable<AIApiResponse<void>> {
    return this.http.post<AIApiResponse<void>>(
      `${this.apiUrl}/ai-recommendations/feedback`,
      request
    );
  }

  /**
   * Obtiene la conversación activa del usuario
   */
  obtenerConversacion(): Observable<AIApiResponse<ConversacionChat>> {
    return this.http
      .get<AIApiResponse<ConversacionChat>>(
        `${this.apiUrl}/ai-recommendations/conversacion`
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.conversacionActiva$.next(response.data);
          } else {
            this.conversacionActiva$.next(null);
          }
        })
      );
  }

  /**
   * Cierra la conversación activa
   */
  cerrarConversacion(): Observable<AIApiResponse<void>> {
    return this.http
      .delete<AIApiResponse<void>>(
        `${this.apiUrl}/ai-recommendations/conversacion`
      )
      .pipe(
        tap(() => {
          this.conversacionActiva$.next(null);
        })
      );
  }

  /**
   * Obtiene la conversación activa actual (síncrono desde el BehaviorSubject)
   */
  getConversacionActual(): ConversacionChat | null {
    return this.conversacionActiva$.value;
  }

  /**
   * Verifica si hay una recomendación en curso
   */
  get estaCargando(): boolean {
    return this.cargandoRecomendacion$.value;
  }
}
