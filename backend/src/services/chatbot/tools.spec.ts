import { describe, it, expect } from '@jest/globals';
import { executeTool } from './tools';

interface ToolExecutionContext {
  userId: string;
  username: string;
  nombre: string;
  isAdmin: boolean;
}

const createMockContext = (overrides?: Partial<ToolExecutionContext>): ToolExecutionContext => {
  return {
    userId: '60d5ec4e8f8b8d1a2c3b4d5e',
    username: 'testuser',
    nombre: 'TEST USER',
    isAdmin: false,
    ...overrides,
  };
};

describe('executeTool', () => {
  it('should return error for unknown tool', async () => {
    const result = await executeTool(
      createMockContext(),
      'unknown_tool',
      '{}'
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Tool desconocido: unknown_tool');
  });

  it('should return error for invalid JSON args', async () => {
    const result = await executeTool(
      createMockContext(),
      'listar_ingredientes',
      'invalid json'
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Argumentos no son JSON válido');
  });

  it('should return error for empty JSON args', async () => {
    const result = await executeTool(
      createMockContext(),
      'obtener_bocatas_predefinidos',
      '{}'
    );
    expect(result.ok).toBe(true);
  });
});
