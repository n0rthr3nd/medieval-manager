import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Bocadillo,
  BocataPredefinido,
  OrderWindowStatus,
  ApiResponse,
} from '../models/bocadillo.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BocadilloService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Bocadillos
  getBocadillosSemanaActual(): Observable<ApiResponse<Bocadillo[]>> {
    return this.http.get<ApiResponse<Bocadillo[]>>(`${this.apiUrl}/bocadillos`);
  }

  createBocadillo(bocadillo: Bocadillo): Observable<ApiResponse<Bocadillo>> {
    return this.http.post<ApiResponse<Bocadillo>>(`${this.apiUrl}/bocadillos`, bocadillo);
  }

  updateBocadillo(id: string, bocadillo: Bocadillo): Observable<ApiResponse<Bocadillo>> {
    return this.http.put<ApiResponse<Bocadillo>>(
      `${this.apiUrl}/bocadillos/${id}`,
      bocadillo
    );
  }

  deleteBocadillo(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/bocadillos/${id}`);
  }

  // Admin: Actualizar precio
  updatePrecio(id: string, precio: number): Observable<ApiResponse<Bocadillo>> {
    return this.http.patch<ApiResponse<Bocadillo>>(
      `${this.apiUrl}/bocadillos/${id}/precio`,
      { precio }
    );
  }

  // Admin: Marcar como pagado
  markAsPagado(id: string, pagado: boolean): Observable<ApiResponse<Bocadillo>> {
    return this.http.patch<ApiResponse<Bocadillo>>(
      `${this.apiUrl}/bocadillos/${id}/pagado`,
      { pagado }
    );
  }

  // Menú
  getIngredientes(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/menu/ingredientes`);
  }

  getBocatasPredefinidos(): Observable<ApiResponse<BocataPredefinido[]>> {
    return this.http.get<ApiResponse<BocataPredefinido[]>>(
      `${this.apiUrl}/menu/bocatas-predefinidos`
    );
  }

  getOrderWindowStatus(): Observable<ApiResponse<OrderWindowStatus>> {
    return this.http.get<ApiResponse<OrderWindowStatus>>(`${this.apiUrl}/menu/order-window`);
  }

  // Admin: Obtener bocadillos de una semana específica
  getBocadillosByWeek(semana: number, ano: number): Observable<ApiResponse<Bocadillo[]>> {
    return this.http.get<ApiResponse<Bocadillo[]>>(
      `${this.apiUrl}/bocadillos/admin/historico?semana=${semana}&ano=${ano}`
    );
  }

  // Admin: Obtener semanas con pedidos
  getSemanasDisponibles(): Observable<ApiResponse<{ semana: number; ano: number; count: number }[]>> {
    return this.http.get<ApiResponse<{ semana: number; ano: number; count: number }[]>>(
      `${this.apiUrl}/bocadillos/admin/semanas`
    );
  }
}
