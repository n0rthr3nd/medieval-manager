import { AlquimistaService } from './alquimista.service';
import { TamanoBocadillo, TipoPan } from '../models/bocadillo.model';
import { mockInjects } from '../../../jest.mock.angular';

describe('AlquimistaService', () => {
  let service: AlquimistaService;
  let http: any;

  beforeEach(() => {
    // Use the same mock instance from jest.mock.angular
    http = mockInjects['HttpClient'];
    service = new AlquimistaService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('getAlquimistaActual', () => {
    it('should get current alquimista', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getAlquimistaActual().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/alquimista');
    });
  });

  describe('upsertAlquimista', () => {
    it('should create or update alquimista', async () => {
      (http.post as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const data = {
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamon', 'queso'],
      };

      const result = await service.upsertAlquimista(data).toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/alquimista', data);
    });
  });

  describe('deleteAlquimista', () => {
    it('should delete alquimista', async () => {
      (http.delete as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.deleteAlquimista().toPromise();

      expect(http.delete).toHaveBeenCalledWith('http://test-api.com/alquimista');
    });
  });
});
