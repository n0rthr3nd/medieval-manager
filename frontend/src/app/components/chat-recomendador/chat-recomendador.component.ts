import { Component, OnInit, OnDestroy, inject, output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AiRecommendationService } from '../../services/ai-recommendation.service';
import {
  ConversacionChat,
  MensajeChat,
  RecomendacionIA,
  IntencionUsuario,
  PropuestaPedido,
  TipoRecomendacion,
} from '../../models/ai-recommendation.model';
import { Bocadillo } from '../../models/bocadillo.model';

@Component({
  selector: 'app-chat-recomendador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-recomendador.component.html',
  styleUrl: './chat-recomendador.component.css',
})
export class ChatRecomendadorComponent implements OnInit, OnDestroy {
  private aiService = inject(AiRecommendationService);
  private destroy$ = new Subject<void>();

  // Outputs
  bocadilloCreado = output<Bocadillo>();
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Estado del chat
  conversacion: ConversacionChat | null = null;
  mensajes: MensajeChat[] = [];
  mensajeUsuario = '';
  cargando = false;
  errorMessage = '';
  chatAbierto = false;

  // Recomendación actual pendiente de aceptar
  recomendacionActual: RecomendacionIA | null = null;

  // Sugerencias rápidas
  sugerenciasRapidas = [
    { texto: 'Sorpréndeme', icono: '🎲' },
    { texto: 'Algo ligero', icono: '🥗' },
    { texto: 'Algo contundente', icono: '🍔' },
    { texto: 'Lo de siempre', icono: '⭐' },
    { texto: 'Quiero probar algo distinto', icono: '🔍' },
  ];

  // Tipos de recomendación para la UI
  readonly TipoRecomendacion = TipoRecomendacion;

  ngOnInit() {
    // Suscribirse al estado de la conversación
    this.aiService.conversacion$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversacion) => {
        this.conversacion = conversacion;
        this.mensajes = conversacion?.mensajes || [];

        // Obtener la última recomendación si existe
        const ultimoMensajeAsistente = this.mensajes
          .filter((m) => m.rol === 'asistente' && m.recomendacion)
          .pop();

        if (ultimoMensajeAsistente?.recomendacion) {
          this.recomendacionActual = ultimoMensajeAsistente.recomendacion;
        }

        this.scrollToBottom();
      });

    // Suscribirse al estado de carga
    this.aiService.cargando$
      .pipe(takeUntil(this.destroy$))
      .subscribe((cargando) => {
        this.cargando = cargando;
      });

    // Cargar conversación activa si existe
    this.cargarConversacion();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la conversación activa
   */
  cargarConversacion() {
    this.aiService.obtenerConversacion().subscribe({
      error: (err) => {
        console.error('Error cargando conversación:', err);
      },
    });
  }

  /**
   * Abre el chat
   */
  abrirChat() {
    this.chatAbierto = true;
    this.errorMessage = '';
    this.scrollToBottom();
  }

  /**
   * Cierra el chat
   */
  cerrarChat() {
    this.chatAbierto = false;
    this.mensajeUsuario = '';
    this.errorMessage = '';
  }

  /**
   * Envía un mensaje y solicita recomendación
   */
  enviarMensaje() {
    if (!this.mensajeUsuario.trim() || this.cargando) {
      return;
    }

    const mensaje = this.mensajeUsuario.trim();
    this.mensajeUsuario = '';
    this.errorMessage = '';

    this.aiService.solicitarRecomendacion(mensaje).subscribe({
      next: (response) => {
        if (response.success && response.data?.recomendacion) {
          this.recomendacionActual = response.data.recomendacion;
        } else {
          this.errorMessage =
            response.error || 'No se pudo obtener una recomendación';
        }
      },
      error: (err) => {
        console.error('Error solicitando recomendación:', err);
        this.errorMessage =
          'Error al conectar con el servicio de recomendaciones';
      },
    });
  }

  /**
   * Envía una sugerencia rápida
   */
  enviarSugerencia(texto: string) {
    this.mensajeUsuario = texto;
    this.enviarMensaje();
  }

  /**
   * Acepta la recomendación y crea el bocadillo
   */
  aceptarRecomendacion(propuesta: PropuestaPedido) {
    if (!this.recomendacionActual || this.cargando) {
      return;
    }

    const request = {
      recomendacionId: new Date().getTime().toString(),
      propuestaPedido: propuesta,
    };

    this.aiService.aceptarRecomendacion(request).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Emitir el bocadillo creado
          this.bocadilloCreado.emit(response.data);

          // Limpiar recomendación actual
          this.recomendacionActual = null;

          // Cerrar el chat
          this.cerrarChat();
        } else {
          this.errorMessage =
            response.error || 'Error al crear el bocadillo';
        }
      },
      error: (err) => {
        console.error('Error aceptando recomendación:', err);
        this.errorMessage = 'Error al aceptar la recomendación';
      },
    });
  }

  /**
   * Rechaza la recomendación
   */
  rechazarRecomendacion() {
    if (!this.recomendacionActual) {
      return;
    }

    const request = {
      recomendacionId: new Date().getTime().toString(),
      aceptada: false,
      razonRechazo: 'Usuario rechazó la recomendación',
    };

    this.aiService.enviarFeedback(request).subscribe({
      next: () => {
        this.recomendacionActual = null;
      },
      error: (err) => {
        console.error('Error enviando feedback:', err);
      },
    });
  }

  /**
   * Formatea el timestamp del mensaje
   */
  formatearHora(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtiene el icono según el la intención o el tipo de recomendación
   */
  getIconoTipoRecomendacion(recomendacion: RecomendacionIA, intent?: IntencionUsuario): string {
    // Si hay una intención explícita en el mensaje, usarla
    if (intent) {
      switch (intent) {
        case IntencionUsuario.LIGERO: return '🥗';
        case IntencionUsuario.CONTUNDENTE: return '🍔';
        case IntencionUsuario.LO_DE_SIEMPRE: return '⭐';
        case IntencionUsuario.SORPRENDEME: return '🎲';
        case IntencionUsuario.PROBAR_DISTINTO: return '🔍';
      }
    }

    // Fallback al tipo de recomendación (antiguo)
    switch (recomendacion.tipoRecomendacion) {
      case TipoRecomendacion.RECURRENTE: return '⭐';
      case TipoRecomendacion.VARIACION_SUAVE: return '🔄';
      case TipoRecomendacion.DESCUBRIMIENTO: return '🔍';
      default: return '💡';
    }
  }

  /**
   * Obtiene el label según la intención o el tipo de recomendación
   */
  getLabelTipoRecomendacion(recomendacion: RecomendacionIA, intent?: IntencionUsuario): string {
    // Si hay una intención explícita en el mensaje, usarla
    if (intent) {
      switch (intent) {
        case IntencionUsuario.LIGERO: return 'Algo ligero';
        case IntencionUsuario.CONTUNDENTE: return 'Algo contundente';
        case IntencionUsuario.LO_DE_SIEMPRE: return 'Lo de siempre';
        case IntencionUsuario.SORPRENDEME: return 'Sorpresa';
        case IntencionUsuario.PROBAR_DISTINTO: return 'Algo distinto';
      }
    }

    // Fallback al tipo de recomendación (antiguo)
    switch (recomendacion.tipoRecomendacion) {
      case TipoRecomendacion.RECURRENTE: return 'Favorito';
      case TipoRecomendacion.VARIACION_SUAVE: return 'Variación';
      case TipoRecomendacion.DESCUBRIMIENTO: return 'Nuevo';
      default: return 'Recomendación';
    }
  }

  /**
   * Formatea la lista de ingredientes
   */
  formatearIngredientes(ingredientes: string[]): string {
    if (ingredientes.length === 0) return '';
    if (ingredientes.length === 1) return ingredientes[0];
    if (ingredientes.length === 2) return ingredientes.join(' y ');

    const ultimos = ingredientes.slice(-2);
    const primeros = ingredientes.slice(0, -2);

    return `${primeros.join(', ')}, ${ultimos.join(' y ')}`;
  }

  /**
   * Obtiene el color del badge de confianza
   */
  getConfianzaColor(confianza: number): string {
    if (confianza >= 0.8) return 'verde';
    if (confianza >= 0.6) return 'amarillo';
    return 'rojo';
  }

  /**
   * Hace scroll hasta el final del chat
   */
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.chatScrollContainer) {
          this.chatScrollContainer.nativeElement.scrollTop =
            this.chatScrollContainer.nativeElement.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Error haciendo scroll:', err);
    }
  }
}
