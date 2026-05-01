// Setup for Angular mocks - this runs before any modules are imported
import { mockInjects } from './jest.mock.angular';

// Mock localStorage for Node.js environment
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: (key: string) => mockLocalStorage.data[key] ?? null,
  setItem: (key: string, value: string) => {
    mockLocalStorage.data[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage.data[key];
  },
  clear: () => {
    mockLocalStorage.data = {};
  },
};

globalThis.localStorage = mockLocalStorage as any;

// Set up global Angular testing module before all tests
beforeAll(() => {
  // Mock @angular/core
  jest.mock('@angular/core', () => {
    const actual = jest.requireActual('@angular/core');
    return {
      ...actual,
      inject: (token: string) => {
        return mockInjects[token];
      },
      Injectable: jest.fn(),
      Component: jest.fn(),
      NgModule: jest.fn(),
      signal: jest.fn((initialValue: any) => {
        return {
          peek: () => initialValue,
          set: () => {},
        };
      }),
    };
  });

  // Mock @angular/router
  jest.mock('@angular/router', () => {
    return {
      ...jest.requireActual('@angular/router'),
      RouterOutlet: jest.fn(),
      RouterModule: jest.fn(),
      RouterLink: jest.fn(),
      ActivatedRoute: mockInjects['Router'],
    };
  });

  // Mock @angular/common/http
  jest.mock('@angular/common/http', () => {
    return {
      ...jest.requireActual('@angular/common/http'),
      HttpClient: jest.fn(),
      HttpHeaders: jest.fn(),
      HttpParams: jest.fn(),
    };
  });
});
