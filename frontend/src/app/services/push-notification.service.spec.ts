import { PushNotificationService } from './push-notification.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new PushNotificationService();
    (service as any).apiUrl = 'http://test-api.com';
    // Clear storage for each test
    localStorage.clear();
  });

  describe('requestPermission', () => {
    it('should request notification permission', async () => {
      const originalNotification = (window as any).Notification;

      (window as any).Notification = {
        requestPermission: () => Promise.resolve('granted'),
      } as any;

      const result = await service.requestPermission();

      expect(result).toBe('granted');

      (window as any).Notification = originalNotification;
    });
  });

  describe('subscribe', () => {
    it('should subscribe to push notifications', async () => {
      // Mock Notification for requestPermission()
      (window as any).Notification = {
        requestPermission: () => Promise.resolve('granted'),
      } as any;

      // Mock service worker registration
      const mockRegistration = {
        ready: Promise.resolve(),
        pushManager: {
          subscribe: jest.fn().mockResolvedValue({
            endpoint: 'https://example.com/subscription',
            getKey: (keyName: string) => {
              const mockKey = new Uint8Array(32).fill(1);
              return mockKey.buffer;
            },
          }),
        },
      };

      (navigator as any).serviceWorker = {
        register: () => Promise.resolve(mockRegistration),
        getRegistration: () => Promise.resolve(mockRegistration),
        ready: Promise.resolve(),
      };

      (http.get as jest.Mock).mockResolvedValue({ success: true, publicKey: 'test-public-key' });
      (http.post as jest.Mock).mockResolvedValue({ success: true });

      await service.subscribe();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/push/vapid-public-key');
      expect(http.post).toHaveBeenCalledWith('http://test-api.com/push/subscribe', expect.anything());
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from push notifications', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/subscription',
        unsubscribe: jest.fn(),
      };

      const mockRegistration = {
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(mockSubscription),
        },
      };

      (navigator as any).serviceWorker = {
        getRegistration: () => Promise.resolve(mockRegistration),
      };

      // Mock http.post to return an Observable
      http.post.mockImplementation(() => ({
        subscribe: (next: any) => {
          if (typeof next === 'function') {
            next({ success: true });
          }
          return { unsubscribe: () => {} };
        },
        toPromise: async () => ({ success: true }),
        pipe: () => ({ subscribe: () => ({ unsubscribe: () => {} }), toPromise: async () => ({ success: true }) }),
      }));

      await service.unsubscribe();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/push/unsubscribe', {
        endpoint: 'https://example.com/subscription',
      });
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('isSubscribed', () => {
    it('should check if user is subscribed', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/subscription',
      };

      const mockRegistration = {
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(mockSubscription),
        },
      };

      (navigator as any).serviceWorker = {
        getRegistration: () => Promise.resolve(mockRegistration),
      };

      const result = await service.isSubscribed();

      expect(result).toBe(true);
    });
  });

  describe('sendManualNotification', () => {
    it('should send a manual notification', async () => {
      // Mock http.post to return an Observable with toPromise
      http.post.mockImplementation(() => ({
        subscribe: (next: any) => {
          if (typeof next === 'function') {
            next({ success: true, message: 'Sent' });
          }
          return { unsubscribe: () => {} };
        },
        toPromise: async () => ({ success: true, message: 'Sent' }),
        pipe: () => ({ subscribe: () => ({ unsubscribe: () => {} }), toPromise: async () => ({ success: true, message: 'Sent' }) }),
      }));

      const result = await service.sendManualNotification('Test Title', 'Test Body').toPromise();

      expect(http.post).toHaveBeenCalledWith('http://test-api.com/push/send', {
        title: 'Test Title',
        body: 'Test Body',
      });
      expect(result).toEqual({ success: true, message: 'Sent' });
    });
  });
});
