import { EstadisticasService } from './estadisticas.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('EstadisticasService', () => {
  let service: EstadisticasService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new EstadisticasService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('getUltimoBocadilloUsuario', () => {
    it('should get last bocadillo', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getUltimoBocadilloUsuario().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/estadisticas/ultimo-bocadillo');
    });
  });

  describe('getEstadisticasGenerales', () => {
    it('should get general statistics', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getEstadisticasGenerales().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/estadisticas/generales');
    });
  });

  describe('getBocadillosMasPedidosGlobal', () => {
    it('should get most ordered bocadillos globally', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getBocadillosMasPedidosGlobal().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/estadisticas/mas-pedidos-global');
    });
  });

  describe('getAgrupacionIngredientesGlobal', () => {
    it('should get ingredient grouping globally', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getAgrupacionIngredientesGlobal().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/estadisticas/agrupacion-ingredientes-global');
    });
  });
});
