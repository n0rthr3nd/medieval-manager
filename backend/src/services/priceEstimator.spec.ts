import { describe, it, expect } from '@jest/globals';
import { estimarPrecio } from './priceEstimator';
import { TamanoBocadillo } from '../models/Bocadillo';

describe('estimarPrecio', () => {
  describe('tier estandar_alto', () => {
    it('Pollo Rebozado Picante normal con 3 ingredientes -> 4.2', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Pollo Rebozado Picante', 'Tomate restregado', 'Queso curado'],
        }),
      ).toBe(4.2);
    });

    it('Pollo Rebozado Picante grande con 3 ingredientes -> 6.1', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.GRANDE,
          ingredientes: ['Pollo Rebozado Picante', 'Tomate restregado', 'Queso curado'],
        }),
      ).toBe(6.1);
    });

    it('Carillada normal con 3 ingredientes -> 4.2', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Carillada', 'Tortilla francesa', 'Queso semi'],
        }),
      ).toBe(4.2);
    });
  });

  describe('tier premium (Jamón Iberico)', () => {
    it('Jamón Iberico grande -> 7.8', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.GRANDE,
          ingredientes: ['Jamón Iberico', 'Queso curado', 'Tomate restregado'],
        }),
      ).toBe(7.8);
    });

    it('Jamón Iberico como ingrediente secundario sigue marcando precio premium', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Tomate restregado', 'Queso fresco', 'Jamón Iberico'],
        }),
      ).toBe(5.6);
    });
  });

  describe('tier especial (Mojama)', () => {
    it('Mojama normal con 3 ingredientes -> 4.6', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Mojama', 'Queso fresco', 'Tomate restregado'],
        }),
      ).toBe(4.6);
    });

    it('Mojama con 4 ingredientes -> 4.8 (4.6 + 0.2)', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Mojama', 'Atún', 'Queso fresco', 'Tomate restregado'],
        }),
      ).toBe(4.8);
    });

    it('Mojama como secundario marca el precio aunque Atún sea principal', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Atún', 'Mojama', 'Tomate restregado', 'Queso fresco'],
        }),
      ).toBe(4.8);
    });
  });

  describe('tier estandar', () => {
    it('Sobrasada picante normal con 3 ingredientes -> 3.7', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Sobrasada picante', 'Cebolla', 'Queso semi'],
        }),
      ).toBe(3.7);
    });

    it('Tortilla francesa con 2 ingredientes -> 3.7 (mínimo del tier)', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Tortilla francesa', 'Jamón'],
        }),
      ).toBe(3.7);
    });

    it('Pavo grande -> 5.6', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.GRANDE,
          ingredientes: ['Pavo', 'Queso fresco', 'Tomate restregado'],
        }),
      ).toBe(5.6);
    });
  });

  describe('ajuste por nº de ingredientes', () => {
    it('5 ingredientes añade 0.4 al base estandar', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Huevo frito', 'Patata', 'Bacon', 'Queso curado', 'Allioli'],
        }),
      ).toBe(4.1);
    });

    it('5 ingredientes en grande tier estandar -> 6.0', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.GRANDE,
          ingredientes: ['Bacon', 'Queso curado', 'Patata', 'Huevo frito', 'Allioli'],
        }),
      ).toBe(6);
    });

    it('1 ingrediente sólo aplica precio base sin descuento', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Pollo Miel'],
        }),
      ).toBe(4.2);
    });
  });

  describe('robustez', () => {
    it('ingredientes vacíos o whitespace se ignoran en el conteo', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['Pollo Rebozado Picante', 'Tomate restregado', 'Queso curado', '', '  '],
        }),
      ).toBe(4.2);
    });

    it('ingrediente desconocido cae en el tier por defecto (estandar)', () => {
      expect(
        estimarPrecio({
          tamano: TamanoBocadillo.NORMAL,
          ingredientes: ['IngredienteInventado'],
        }),
      ).toBe(3.7);
    });

    it('redondeo a 1 decimal', () => {
      const precio = estimarPrecio({
        tamano: TamanoBocadillo.NORMAL,
        ingredientes: ['Mojama', 'a', 'b', 'c', 'd', 'e'],
      });
      expect(Number.isFinite(precio)).toBe(true);
      expect(Math.round(precio * 10)).toBe(precio * 10);
    });
  });
});
