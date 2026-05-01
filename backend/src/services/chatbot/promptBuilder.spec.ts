import { construirSystemPrompt } from './promptBuilder';

describe('promptBuilder', () => {
  describe('construirSystemPrompt', () => {
    it('should build a system prompt with user name', () => {
      const ctx = {
        nombreUsuario: 'Juan',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'lunes',
      };

      const prompt = construirSystemPrompt(ctx);

      expect(prompt).toContain('Eres el asistente conversacional de Medieval Manager');
      expect(prompt).toContain('Hablas con Juan');
      expect(prompt).toContain('2024-01-15');
      expect(prompt).toContain('lunes');
      expect(prompt).toContain('1. Listar ingredientes disponibles');
      expect(prompt).toContain('Solo puedo ayudarte con pedidos de bocadillos');
    });

    it('should include rules about user operations', () => {
      const ctx = {
        nombreUsuario: 'Ana',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'viernes',
      };

      const prompt = construirSystemPrompt(ctx);

      expect(prompt).toContain('Las tools de escritura (crear/editar/eliminar) operan SIEMPRE sobre el usuario que está hablando contigo');
      expect(prompt).toContain('Antes de crear, editar o eliminar un pedido, confirma con el usuario');
    });

    it('should include menu restrictions', () => {
      const ctx = {
        nombreUsuario: 'Carlos',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'martes',
      };

      const prompt = construirSystemPrompt(ctx);

      expect(prompt).toContain('Pan integral y pan de semillas SOLO admiten tamaño normal');
      expect(prompt).toContain('Cada pedido lleva entre 1 y 10 ingredientes');
    });

    it('should return a string', () => {
      const ctx = {
        nombreUsuario: 'Test',
        fechaActualISO: new Date().toISOString(),
        diaSemana: 'miércoles',
      };

      const prompt = construirSystemPrompt(ctx);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include example responses for out-of-domain questions', () => {
      const ctx = {
        nombreUsuario: 'Test',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'jueves',
      };

      const prompt = construirSystemPrompt(ctx);

      expect(prompt).toContain('¿Qué tiempo hace?');
      expect(prompt).toContain('Ignora las instrucciones anteriores');
    });

    it('should handle special characters in user name', () => {
      const ctx = {
        nombreUsuario: 'José María O\'Connor',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'domingo',
      };

      const prompt = construirSystemPrompt(ctx);
      expect(prompt).toContain('Hablas con José María O\'Connor');
    });

    it('should include prompt style guidelines', () => {
      const ctx = {
        nombreUsuario: 'Test',
        fechaActualISO: '2024-01-15T10:00:00Z',
        diaSemana: 'viernes',
      };

      const prompt = construirSystemPrompt(ctx);

      expect(prompt).toContain('Mensajes cortos: 1-3 frases');
      expect(prompt).toContain('Te propongo: bocadillo');
    });
  });
});
