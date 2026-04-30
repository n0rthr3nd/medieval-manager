import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SystemConfig,
  UpdateOrdersStatusDto,
  UpdateChatbotConfigDto,
} from '../models/system-config.model';
import { ApiResponse } from '../models/bocadillo.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SystemConfigService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system`;

  getSystemConfig(): Observable<ApiResponse<SystemConfig>> {
    return this.http.get<ApiResponse<SystemConfig>>(this.apiUrl);
  }

  updateOrdersStatus(data: UpdateOrdersStatusDto): Observable<ApiResponse<SystemConfig>> {
    return this.http.patch<ApiResponse<SystemConfig>>(`${this.apiUrl}/orders`, data);
  }

  updateChatbotConfig(data: UpdateChatbotConfigDto): Observable<ApiResponse<SystemConfig>> {
    return this.http.patch<ApiResponse<SystemConfig>>(`${this.apiUrl}/chatbot`, data);
  }
}
