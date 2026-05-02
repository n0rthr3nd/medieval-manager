import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BocadilloService } from '../../services/bocadillo.service';
import { AuthService } from '../../services/auth.service';
import { Bocadillo, SemanaDisponible } from '../../models/bocadillo.model';

interface PaymentRow {
  id: string;
  nombre: string;
  bocadillo: string;
  precio?: number;
  pagado: boolean;
}

interface PaymentSummary {
  total: number;
  pagado: number;
  pendiente: number;
  countPagados: number;
  countPendientes: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent implements OnInit {
  private bocadilloService = inject(BocadilloService);
  private authService = inject(AuthService);

  isAdmin = false;
  payments: PaymentRow[] = [];
  summary: PaymentSummary = {
    total: 0,
    pagado: 0,
    pendiente: 0,
    countPagados: 0,
    countPendientes: 0,
  };
  isLoading = false;
  errorMessage = '';

  semanas: SemanaDisponible[] = [];
  selectedWeekKey = '';
  selectedSemana: number | null = null;
  selectedAno: number | null = null;

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    if (this.isAdmin) {
      this.loadSemanas();
    } else {
      this.loadPayments();
    }
  }

  loadSemanas() {
    this.bocadilloService.getSemanasDisponibles().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.semanas = response.data;
          if (this.semanas.length > 0) {
            const first = this.semanas[0];
            this.selectedWeekKey = `${first.semana}|${first.ano}`;
            this.selectedSemana = first.semana;
            this.selectedAno = first.ano;
            this.loadPaymentsByWeek();
          }
        }
      },
      error: (error) => {
        this.errorMessage = 'Error cargando semanas disponibles';
        console.error('Error cargando semanas:', error);
      },
    });
  }

  onWeekChange() {
    const parts = this.selectedWeekKey.split('|');
    this.selectedSemana = parseInt(parts[0]);
    this.selectedAno = parseInt(parts[1]);
    this.loadPaymentsByWeek();
  }

  loadPaymentsByWeek() {
    if (this.selectedSemana === null || this.selectedAno === null) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.bocadilloService.getBocadillosByWeek(this.selectedSemana, this.selectedAno).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.processPayments(response.data);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error cargando los pagos';
        console.error('Error cargando pagos:', error);
        this.isLoading = false;
      },
    });
  }

  loadPayments() {
    this.isLoading = true;
    this.bocadilloService.getBocadillosSemanaActual().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.processPayments(response.data);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error cargando los pagos';
        console.error('Error cargando pagos:', error);
        this.isLoading = false;
      },
    });
  }

  processPayments(bocadillos: Bocadillo[]) {
    this.payments = bocadillos
      .filter(b => b.precio !== undefined && b.precio > 0)
      .map((b) => ({
        id: b._id || '',
        nombre: b.nombre,
        bocadillo: this.formatBocadillo(b),
        precio: b.precio,
        pagado: b.pagado,
      }));

    this.calculateSummary();
  }

  formatBocadillo(bocadillo: Bocadillo): string {
    const parts: string[] = [];

    if (bocadillo.bocataPredefinido) {
      parts.push(`${bocadillo.bocataPredefinido}`);
    }

    parts.push(bocadillo.tamano === 'normal' ? 'Normal' : 'Grande');

    if (bocadillo.tipoPan !== 'normal') {
      const panLabel = bocadillo.tipoPan === 'integral' ? 'Integral' : 'Semillas';
      parts.push(panLabel);
    }

    if (bocadillo.ingredientes && bocadillo.ingredientes.length > 0) {
      const ingredientes = bocadillo.ingredientes.join(', ');
      if (bocadillo.bocataPredefinido) {
        parts.push(`+ ${ingredientes}`);
      } else {
        parts.push(ingredientes);
      }
    }

    return parts.join(' | ');
  }

  calculateSummary() {
    this.summary.total = 0;
    this.summary.pagado = 0;
    this.summary.pendiente = 0;
    this.summary.countPagados = 0;
    this.summary.countPendientes = 0;

    this.payments.forEach((payment) => {
      const precio = payment.precio || 0;
      this.summary.total += precio;

      if (payment.pagado) {
        this.summary.pagado += precio;
        this.summary.countPagados++;
      } else {
        this.summary.pendiente += precio;
        this.summary.countPendientes++;
      }
    });
  }

  formatCurrency(value: number): string {
    return value.toFixed(2) + '€';
  }

  formatWeekLabel(s: SemanaDisponible): string {
    return `Semana ${s.semana} de ${s.ano} (${s.count} pedidos)`;
  }
}
