import { TamanoBocadillo, TipoPan } from '../models/Bocadillo';

export interface BocataPredefinido {
  nombre: string;
  ingredientes: string[];
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
}

export const INGREDIENTES_DISPONIBLES = [
  'Pollo Miel',
  'Costillas Miel',
  'Costillas Barbacoa',
  'Pollo Rebozado Picante',
  'Carillada',
  'Chilindron',
  'Chilindron Picante',
  'Kebab',
  'Tortilla francesa',
  'Tortilla patata',
  'Tortilla ajos',
  'Jamón',
  'Jamón Iberico',
  'Longaniza',
  'Chorizo',
  'Morcilla',
  'Tortilla',
  'Patata',
  'Aceite',
  'Queso curado',
  'Queso semi',
  'Queso fresco',
  'Ensalada',
  'Mojama',
  'Tomate',
  'Tomate restregado',
  'Lechuga',
  'Atún',
  'Anchoas',
  'Pavo',
  'Cebolla',
  'Olivas',
  'Bacon',
  'Huevo frito',
  'Huevo duro',
  'Mayonesa',
  'Mostaza',
];

export const BOCATAS_PREDEFINIDOS: BocataPredefinido[] = [
  {
    nombre: 'Alquimista Chilindron Picante',
    ingredientes: ['Chilindron Picante', 'Queso curado', 'Huevo frito'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Grande Alquimista Chilindron Picante',
    ingredientes: ['Chilindron Picante', 'Queso curado', 'Huevo frito'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Alquimista Carrillada Francesa',
    ingredientes: ['Carillada', 'Tortilla francesa', 'Queso semi'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Grande Alquimista Carrillada Francesa',
    ingredientes: ['Carillada', 'Tortilla francesa', 'Queso semi'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Alquimista Jamon Tortilla Patata',
    ingredientes: ['Jamón', 'Tortilla patata', 'Tomate restregado'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Grande Alquimista Jamon Tortilla Patata',
    ingredientes: ['Jamón', 'Tortilla patata', 'Tomate restregado'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Alquimista Rebozado Picante',
    ingredientes: ['Pollo Rebozado Picante', 'Tomate restregado', 'Queso curado'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.SEMILLAS,
  },
  {
    nombre: 'Grande Alquimista Rebozado Picante',
    ingredientes: ['Pollo Rebozado Picante', 'Tomate restregado', 'Queso curado'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Blanco y Negro',
    ingredientes: ['Longaniza', 'Morcilla'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Grande Blanco y Negro',
    ingredientes: ['Longaniza', 'Morcilla'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Blanco, Negro y Rojo',
    ingredientes: ['Longaniza', 'Morcilla', 'Chorizo'],
    tamano: TamanoBocadillo.NORMAL,
    tipoPan: TipoPan.NORMAL,
  },
  {
    nombre: 'Grande Blanco, Negro y Rojo',
    ingredientes: ['Longaniza', 'Morcilla', 'Chorizo'],
    tamano: TamanoBocadillo.GRANDE,
    tipoPan: TipoPan.NORMAL,
  },
];
