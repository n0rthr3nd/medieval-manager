import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BocadilloFormComponent } from '../../components/bocadillo-form/bocadillo-form.component';
import { BocadilloListComponent } from '../../components/bocadillo-list/bocadillo-list.component';
import { ChatRecomendadorComponent } from '../../components/chat-recomendador/chat-recomendador.component';
import { BocadilloService } from '../../services/bocadillo.service';
import { SettingsService, Settings } from '../../services/settings.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { Bocadillo, OrderWindowStatus } from '../../models/bocadillo.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, BocadilloFormComponent, BocadilloListComponent, ChatRecomendadorComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  private bocadilloService = inject(BocadilloService);
  private settingsService = inject(SettingsService);
  private pushService = inject(PushNotificationService);

  orderWindowStatus = signal<OrderWindowStatus | null>(null);
  settings = signal<Settings | null>(null);
  refreshList = signal<number>(0);
  editingBocadillo = signal<Bocadillo | null>(null);
  isSubscribedToPush = signal<boolean>(false);
  isSubscribing = signal<boolean>(false);

  ngOnInit() {
    this.checkOrderWindow();
    this.loadSettings();
    this.checkPushSubscription();
    // Comprobar el estado cada 5 minutos
    setInterval(() => this.checkOrderWindow(), 5 * 60 * 1000);
  }

  loadSettings() {
    this.settingsService.getSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.settings.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading settings:', error);
      },
    });
  }

  async checkPushSubscription() {
    this.isSubscribedToPush.set(await this.pushService.isSubscribed());
  }

  async togglePushNotifications() {
    this.isSubscribing.set(true);
    try {
      if (this.isSubscribedToPush()) {
        await this.pushService.unsubscribe();
        this.isSubscribedToPush.set(false);
      } else {
        await this.pushService.subscribe();
        this.isSubscribedToPush.set(true);
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      alert('Error al gestionar las notificaciones. Por favor, intenta de nuevo.');
    } finally {
      this.isSubscribing.set(false);
    }
  }

  checkOrderWindow() {
    this.bocadilloService.getOrderWindowStatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.orderWindowStatus.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error checking order window:', error);
      },
    });
  }

  onBocadilloCreated(bocadillo: Bocadillo) {
    this.refreshList.update((value) => value + 1);
  }

  onBocadilloUpdated(bocadillo: Bocadillo) {
    this.editingBocadillo.set(null);
    this.refreshList.update((value) => value + 1);
  }

  onEditRequested(bocadillo: Bocadillo) {
    this.editingBocadillo.set(bocadillo);
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getDeadlineDate(): string {
    const status = this.orderWindowStatus();
    if (!status?.deadline) return '';
    const date = new Date(status.deadline);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getNextOpeningDate(): string {
    const status = this.orderWindowStatus();
    if (!status?.nextOpening) return '';
    const date = new Date(status.nextOpening);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getClosedUntilDate(): string {
    const settings = this.settings();
    if (!settings?.closedUntilDate) return '';
    const date = new Date(settings.closedUntilDate);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isOrderingAllowed(): boolean {
    const settings = this.settings();
    const windowStatus = this.orderWindowStatus();
    return windowStatus?.isOpen === true && settings?.ordersClosed !== true;
  }
}
