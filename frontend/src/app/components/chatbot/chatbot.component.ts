import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatbotService } from '../../services/chatbot.service';
import {
  ChatMensajeUI,
  ChatbotStatus,
  ChatStreamEvent,
} from '../../models/chatbot.model';

/**
 * Widget flotante del chatbot conversacional con streaming.
 *
 * Solo se muestra si el usuario tiene chatbotMode != 'disabled' y el
 * kill-switch global no está activo. Si ambas condiciones no se cumplen, el
 * componente se renderiza vacío (no estorba).
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css',
})
export class ChatbotComponent implements OnInit, OnDestroy {
  private chatbotService = inject(ChatbotService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  bocadilloAfectado = output<{ id: string; accion: 'creado' | 'editado' | 'eliminado' }>();

  status = signal<ChatbotStatus | null>(null);
  abierto = signal(false);
  mensajes = signal<ChatMensajeUI[]>([]);
  inputValue = signal('');
  enviando = signal(false);
  errorMessage = signal('');
  animacionVista = localStorage.getItem('chatbotAnimacionVista') === 'true';
  mostrarAnimacion = computed(() => !this.animacionVista);

  enabled = computed(() => !!this.status()?.enabled);
  isBeta = computed(() => !!this.status()?.isBeta);
  remaining = computed(() => this.status()?.remaining ?? 0);
  weeklyLimit = computed(() => this.status()?.weeklyLimit ?? 0);
  quotaTexto = computed(() => `${this.remaining()}/${this.weeklyLimit()} mensajes`);
  sinCuota = computed(() => this.remaining() <= 0);

  private currentSubscription?: Subscription;
  private currentAbort?: () => void;

  async ngOnInit() {
    await this.refreshStatus();
    if (this.enabled()) {
      this.cargarHistorial();
    }
  }

  ngOnDestroy() {
    this.cancelarStream();
  }

  async refreshStatus() {
    const s = await this.chatbotService.getStatusOnce();
    this.status.set(s);
  }

  private cargarHistorial() {
    this.chatbotService.getConversacion().subscribe({
      next: res => {
        if (res?.data?.mensajes) {
          this.mensajes.set(
            res.data.mensajes.map((m: any) => ({
              id: m.id,
              rol: m.rol,
              contenido: m.contenido,
              timestamp: new Date(m.timestamp),
            })),
          );
          this.scrollToBottom();
        }
      },
      error: () => { /* silenciamos: no es crítico */ },
    });
  }

  abrir() {
    this.abierto.set(true);
    this.marcarAnimacionComoVista();
    setTimeout(() => this.scrollToBottom(), 50);
  }

  cerrar() {
    this.abierto.set(false);
    this.marcarAnimacionComoVista();
  }

  cancelarStream() {
    this.currentSubscription?.unsubscribe();
    this.currentAbort?.();
    this.currentSubscription = undefined;
    this.currentAbort = undefined;
  }

  enviar() {
    this.marcarAnimacionComoVista();
    const texto = this.inputValue().trim();
    if (!texto || this.enviando() || this.sinCuota()) return;

    const userMsg: ChatMensajeUI = {
      id: `u_${Date.now()}`,
      rol: 'usuario',
      contenido: texto,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMensajeUI = {
      id: `a_${Date.now()}`,
      rol: 'asistente',
      contenido: '',
      timestamp: new Date(),
      streaming: true,
      toolCalls: [],
    };

    this.mensajes.update(prev => [...prev, userMsg, assistantMsg]);
    this.inputValue.set('');
    this.enviando.set(true);
    this.errorMessage.set('');
    this.scrollToBottom();

    const { events$, abort } = this.chatbotService.sendMessage(texto);
    this.currentAbort = abort;

    this.currentSubscription = events$.subscribe({
      next: ev => this.handleEvent(ev, assistantMsg.id),
      error: err => {
        this.errorMessage.set(err?.message || 'Error en el stream');
        this.finalizeStreaming(assistantMsg.id);
        this.enviando.set(false);
      },
      complete: () => {
        this.finalizeStreaming(assistantMsg.id);
        this.enviando.set(false);
      },
    });
  }

  private handleEvent(ev: ChatStreamEvent, assistantId: string) {
    switch (ev.type) {
      case 'connected':
        this.updateRemaining(ev.data.quotaRemaining);
        break;
      case 'text_delta':
        this.appendDelta(assistantId, ev.data.delta);
        this.scrollToBottom();
        break;
      case 'tool_call_pending':
        this.upsertToolCall(assistantId, { toolName: ev.data.toolName });
        this.scrollToBottom();
        break;
      case 'tool_call_done':
        this.upsertToolCall(assistantId, {
          toolName: ev.data.toolName,
          ok: ev.data.ok,
          summary: ev.data.summary,
        });
        break;
      case 'propuesta_pedido':
        this.mensajes.update(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, propuesta: ev.data } : m)),
        );
        break;
      case 'bocadillo_afectado':
        this.mensajes.update(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, bocadilloAfectado: ev.data } : m,
          ),
        );
        this.bocadilloAfectado.emit(ev.data);
        break;
      case 'done':
        this.updateRemaining(ev.data.quotaRemaining);
        break;
      case 'error':
        this.errorMessage.set(ev.data.message || 'Error');
        this.appendDelta(assistantId, '');
        break;
    }
  }

  private appendDelta(assistantId: string, delta: string) {
    this.mensajes.update(prev =>
      prev.map(m =>
        m.id === assistantId ? { ...m, contenido: m.contenido + delta } : m,
      ),
    );
  }

  private upsertToolCall(
    assistantId: string,
    call: { toolName: string; ok?: boolean; summary?: string },
  ) {
    this.mensajes.update(prev =>
      prev.map(m => {
        if (m.id !== assistantId) return m;
        const calls = [...(m.toolCalls || [])];
        const idx = calls.findIndex(c => c.toolName === call.toolName && c.ok === undefined);
        if (idx >= 0 && call.ok !== undefined) {
          calls[idx] = { ...calls[idx], ...call };
        } else {
          calls.push(call);
        }
        return { ...m, toolCalls: calls };
      }),
    );
  }

  private finalizeStreaming(assistantId: string) {
    this.mensajes.update(prev =>
      prev.map(m => (m.id === assistantId ? { ...m, streaming: false } : m)),
    );
  }

  private updateRemaining(remaining: number) {
    if (remaining < 0) return;
    const cur = this.status();
    if (!cur) return;
    this.status.set({ ...cur, remaining, used: cur.weeklyLimit - remaining });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  formatearHora(d: Date): string {
    return new Date(d).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toolLabel(toolName: string): string {
    const labels: Record<string, string> = {
      listar_ingredientes: 'Consultando ingredientes',
      obtener_mis_pedidos_recientes: 'Revisando tu histórico',
      obtener_mis_ingredientes_favoritos: 'Buscando tus favoritos',
      obtener_bocatas_predefinidos: 'Mirando el menú',
      consultar_ventana_pedidos: 'Comprobando si está abierto',
      crear_mi_pedido: 'Creando tu pedido',
      editar_mi_pedido: 'Editando tu pedido',
      eliminar_mi_pedido: 'Eliminando tu pedido',
    };
    return labels[toolName] ?? toolName;
  }

  accionLabel(accion: 'creado' | 'editado' | 'eliminado'): string {
    return { creado: 'Pedido creado', editado: 'Pedido editado', eliminado: 'Pedido eliminado' }[accion];
  }

  marcarAnimacionComoVista() {
    localStorage.setItem('chatbotAnimacionVista', 'true');
    this.animacionVista = true;
  }
}
