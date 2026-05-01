import { AiRecommendationService } from './ai-recommendation.service';
import { TamanoBocadillo, TipoPan } from '../models/bocadillo.model';
import { mockInjects } from '../../../jest.mock.angular';
import { AceptarRecomendacionRequest, IntencionUsuario, TipoRecomendacion } from '../models/ai-recommendation.model';

describe('AiRecommendationService', () => {
  let service: AiRecommendationService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new AiRecommendationService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('solicitarRecomendacion', () => {
    it('should request a recommendation', async () => {
      (http.post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          recomendacion: {
            respuestaTexto: 'Te recomiendo un bocadillo de jamón',
            propuestaPedido: {
              nombre: 'Bocadillo Jamón',
              tamano: TamanoBocadillo.NORMAL,
              tipoPan: TipoPan.NORMAL,
              ingredientes: ['jamón', 'queso'],
            },
            tipoRecomendacion: TipoRecomendacion.RECURRENTE,
            razonamiento: 'Porque es una opción clásica',
            confianza: 0.9,
          },
        },
      });

      const result = await service.solicitarRecomendacion('Quiero comer algo').toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/ai-recommendations/solicitar', {
        mensajeUsuario: 'Quiero comer algo',
      });
      expect(result).toEqual({
        success: true,
        data: {
          recomendacion: {
            respuestaTexto: 'Te recomiendo un bocadillo de jamón',
            propuestaPedido: {
              nombre: 'Bocadillo Jamón',
              tamano: TamanoBocadillo.NORMAL,
              tipoPan: TipoPan.NORMAL,
              ingredientes: ['jamón', 'queso'],
            },
            tipoRecomendacion: TipoRecomendacion.RECURRENTE,
            razonamiento: 'Porque es una opción clásica',
            confianza: 0.9,
          },
        },
      });
    });
  });

  describe('aceptarRecomendacion', () => {
    it('should accept a recommendation', async () => {
      (http.post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          nombre: 'Bocadillo Creado',
        },
      });

      const request: AceptarRecomendacionRequest = {
        recomendacionId: 'rec-1',
        propuestaPedido: {
          nombre: 'Bocadillo Creado',
          tamano: TamanoBocadillo.NORMAL,
          tipoPan: TipoPan.NORMAL,
          ingredientes: ['jamón', 'queso'],
        },
      };

      const result = await service.aceptarRecomendacion(request).toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/ai-recommendations/aceptar', request);
    });
  });

  describe('enviarFeedback', () => {
    it('should send feedback', async () => {
      (http.post as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.enviarFeedback({
        recomendacionId: 'rec-1',
        aceptada: true,
      }).toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/ai-recommendations/feedback', {
        recomendacionId: 'rec-1',
        aceptada: true,
      });
    });
  });

  describe('obtenerConversacion', () => {
    it('should get conversation', async () => {
      (http.get as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'conv-1',
          mensajes: [],
          activa: true,
        },
      });

      const result = await service.obtenerConversacion().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/ai-recommendations/conversacion');
      expect(result).toEqual({
        success: true,
        data: {
          _id: 'conv-1',
          mensajes: [],
          activa: true,
        },
      });
    });
  });

  describe('cerrarConversacion', () => {
    it('should close conversation', async () => {
      (http.delete as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.cerrarConversacion().toPromise();

      expect(http.delete).toHaveBeenCalledWith('http://test-api.com/ai-recommendations/conversacion');
    });
  });

  describe('get estaCargando', () => {
    it('should return loading state', () => {
      expect(service['cargandoRecomendacion$'].getValue()).toBe(false);
    });
  });
});
