import { IngredienteService } from './ingrediente.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('IngredienteService', () => {
  let service: IngredienteService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new IngredienteService(http);
    (service as any).apiUrl = 'http://test-api.com/ingredientes';
  });

  describe('getIngredientes', () => {
    it('should get all ingredients', async () => {
      (http.get as jest.Mock).mockResolvedValue([{ id: '1', nombre: 'Jamón' }]);

      const result = await service.getIngredientes().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/ingredientes', {
        params: {},
      });
      expect(result).toEqual([{ id: '1', nombre: 'Jamón' }]);
    });

    it('should filter by disponible', async () => {
      (http.get as jest.Mock).mockResolvedValue([]);

      await service.getIngredientes(true).toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/ingredientes', {
        params: { disponible: 'true' },
      });
    });
  });

  describe('getIngredienteById', () => {
    it('should get a specific ingredient', async () => {
      (http.get as jest.Mock).mockResolvedValue({ id: '1', nombre: 'Jamón' });

      const result = await service.getIngredienteById('1').toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/ingredientes/1');
    });
  });

  describe('createIngrediente', () => {
    it('should create a new ingredient', async () => {
      (http.post as jest.Mock).mockResolvedValue({ id: '1', nombre: 'Jamón' });

      const result = await service.createIngrediente({
        nombre: 'Jamón',
        categoria: 'Embutidos',
      }).toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/ingredientes', {
        nombre: 'Jamón',
        categoria: 'Embutidos',
      });
    });
  });

  describe('updateIngrediente', () => {
    it('should update an ingredient', async () => {
      (http.put as jest.Mock).mockResolvedValue({ id: '1', nombre: 'Jamón' });

      const result = await service.updateIngrediente('1', { nombre: 'Jamón' }).toPromise();

      expect(http.put).toHaveBeenCalledWith('http://test-api.com/ingredientes/1', { nombre: 'Jamón' });
    });
  });

  describe('deleteIngrediente', () => {
    it('should delete an ingredient', async () => {
      (http.delete as jest.Mock).mockResolvedValue({ message: 'Deleted' });

      const result = await service.deleteIngrediente('1').toPromise();

      expect(http.delete).toHaveBeenCalledWith('http://test-api.com/ingredientes/1');
    });
  });

  describe('getCategorias', () => {
    it('should get available categories', async () => {
      (http.get as jest.Mock).mockResolvedValue(['Embutidos', 'Lácteos']);

      const result = await service.getCategorias().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/ingredientes/categorias/list');
    });
  });
});
