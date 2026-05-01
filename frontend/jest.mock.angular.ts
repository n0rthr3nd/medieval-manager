// Helper to create a mock method that has toPromise and pipe
function createMockMethod() {
  const method = jest.fn() as any;

  // Store the mock value when mockResolvedValue is called
  const mockStore = {
    value: undefined as any,
    isRejected: false,
  };

  // Override mockResolvedValue to store the value
  method.mockResolvedValue = (value: any) => {
    mockStore.value = value;
    mockStore.isRejected = false;
    return method;
  };

  // Override mockRejectedValue to store the error
  method.mockRejectedValue = (error: any) => {
    mockStore.value = error;
    mockStore.isRejected = true;
    return method;
  };

  // Override mockRejectedValueOnce to store the error for single use
  method.mockRejectedValueOnce = (error: any) => {
    mockStore.value = error;
    mockStore.isRejected = true;
    return method;
  };

  // When called, return a simple Observable-like object
  // This doesn't support rxjs operators but allows basic testing
  method.mockImplementation(() => {
    const storedValue = mockStore.value;
    const isRejected = mockStore.isRejected;

    const observable: any = {
      subscribe: (observer: any) => {
        // Handle observer with next, error, complete methods
        if (typeof observer === 'function') {
          // Observer passed as function (old style)
          if (isRejected) {
            // For rejected promises, call error immediately
            observer(storedValue); // Error handler as second argument
          } else {
            observer(storedValue);
          }
          return { unsubscribe: () => {} };
        }
        // Observer passed as object
        if (isRejected) {
          if (observer.error) observer.error(storedValue);
          if (observer.complete) observer.complete();
        } else {
          if (observer.next) observer.next(storedValue);
          if (observer.complete) observer.complete();
        }
        return { unsubscribe: () => {} };
      },
      toPromise: async () => {
        if (isRejected) {
          throw storedValue;
        }
        return storedValue;
      },
      // Handle RxJS lift mechanism used by tap and other operators
      lift: (operator: any) => {
        // Return the same observable for lift to work with tap etc.
        return observable;
      },
      pipe: (operatorFactory: any) => {
        // For pipe, return the same observable to allow chaining
        return observable;
      },
    };
    return observable;
  });

  return method;
}

// Mock injects storage - defined first
export const mockInjects: Record<string, any> = {
  HttpClient: {
    get: createMockMethod(),
    post: createMockMethod(),
    put: createMockMethod(),
    delete: createMockMethod(),
    patch: createMockMethod(),
  },
  AuthService: {
    getToken: jest.fn(),
    currentUser$: { value: null },
    currentUserSubject: { value: { next: jest.fn() } },
    logout: jest.fn(),
  },
  Router: {
    navigate: jest.fn(),
  },
};

// Mock for @angular/core
export const Injectable = jest.fn();
export const inject = jest.fn((token: any) => {
  // Handle both string tokens and class/function tokens
  // Use token string if available, otherwise fall back to name
  let tokenKey: string;
  if (typeof token === 'string') {
    tokenKey = token;
  } else if (token && token.name) {
    tokenKey = token.name;
  } else {
    tokenKey = String(token);
  }
  const result = mockInjects[tokenKey];
  console.log('inject called, tokenKey:', tokenKey, 'result:', result);
  return result;
});
export const signal = jest.fn((initialValue: any) => ({
  peek: () => initialValue,
  set: () => {},
}));

// Mock for @angular/common/http - HttpClient returns the mock instance
export function HttpClient() { return mockInjects['HttpClient']; }
export function HttpHeaders() {}
export function HttpParams() {}

// Mock for @angular/router
export function RouterOutlet() {}
export function RouterModule() {}
export function RouterLink() {}
export function Router() {}
export const ActivatedRoute = {
  snapshot: {
    params: {},
    queryParamMap: { get: jest.fn() },
    data: {},
  },
  params: { subscribe: jest.fn() },
  queryParamMap: { subscribe: jest.fn() },
  data: { subscribe: jest.fn() },
  parent: null,
  firstChild: null,
  children: [],
  pathFromRoot: [],
  toString: () => 'ActivatedRoute',
};
