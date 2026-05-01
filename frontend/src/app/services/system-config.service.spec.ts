import { SystemConfigService } from './system-config.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new SystemConfigService();
    (service as any).apiUrl = 'http://test-api.com/system';
  });

  describe('getSystemConfig', () => {
    it('should get system config', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: {} });

      const result = await service.getSystemConfig().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/system');
    });
  });

  describe('updateOrdersStatus', () => {
    it('should update orders status', async () => {
      (http.patch as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.updateOrdersStatus({ manuallyClosedOrders: true }).toPromise();

      expect(http.patch).toHaveBeenCalledWith('http://test-api.com/system/orders', { manuallyClosedOrders: true });
    });
  });

  describe('updateChatbotConfig', () => {
    it('should update chatbot config', async () => {
      (http.patch as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.updateChatbotConfig({ chatbotGloballyEnabled: true }).toPromise();

      expect(http.patch).toHaveBeenCalledWith('http://test-api.com/system/chatbot', { chatbotGloballyEnabled: true });
    });
  });
});
