import { BocadilloService } from './bocadillo.service';
import { TamanoBocadillo, TipoPan } from '../models/bocadillo.model';
import { mockInjects } from '../../../jest.mock.angular';

describe('BocadilloService', () => {
  let service: BocadilloService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new BocadilloService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('getBocadillosSemanaActual', () => {
    it('should get bocadillos for current week', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: [] });

      const result = await service.getBocadillosSemanaActual().toPromise();

      expect(result).toEqual({ success: true, data: [] });
      expect(http.get).toHaveBeenCalledWith('http://test-api.com/bocadillos');
    });
  });

  describe('createBocadillo', () => {
    it('should create a new bocadillo', async () => {
      (http.post as jest.Mock).mockResolvedValue({ success: true, data: { id: '1' } });

      const bocadillo = {
        nombre: 'Nuevo Bocadillo',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamon', 'queso'],
        pagado: false,
      };

      const result = await service.createBocadillo(bocadillo).toPromise();

      expect(result).toEqual({ success: true, data: { id: '1' } });
      expect(http.post).toHaveBeenCalledWith('http://test-api.com/bocadillos', bocadillo);
    });
  });

  describe('updateBocadillo', () => {
    it('should update an existing bocadillo', async () => {
      (http.put as jest.Mock).mockResolvedValue({ success: true, data: { id: '1' } });

      const bocadillo = {
        nombre: 'Actualizado',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes: ['jamon', 'queso'],
        pagado: false,
      };

      const result = await service.updateBocadillo('1', bocadillo).toPromise();

      expect(http.put).toHaveBeenCalledWith('http://test-api.com/bocadillos/1', bocadillo);
    });
  });

  describe('deleteBocadillo', () => {
    it('should delete a bocadillo', async () => {
      (http.delete as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.deleteBocadillo('1').toPromise();

      expect(http.delete).toHaveBeenCalledWith('http://test-api.com/bocadillos/1');
    });
  });

  describe('updatePrecio', () => {
    it('should update the price', async () => {
      (http.patch as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.updatePrecio('1', 5.50).toPromise();

      expect(http.patch).toHaveBeenCalledWith('http://test-api.com/bocadillos/1/precio', { precio: 5.50 });
    });
  });

  describe('markAsPagado', () => {
    it('should mark as paid', async () => {
      (http.patch as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.markAsPagado('1', true).toPromise();

      expect(http.patch).toHaveBeenCalledWith('http://test-api.com/bocadillos/1/pagado', { pagado: true });
    });
  });

  describe('getOrderWindowStatus', () => {
    it('should get order window status', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: { isOpen: true } });

      const result = await service.getOrderWindowStatus().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/menu/order-window');
    });
  });
});
