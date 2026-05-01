import { ChatbotService } from './chatbot.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let http: any;
  let auth: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    auth = mockInjects['AuthService'];
    service = new ChatbotService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('getStatus', () => {
    it('should get chatbot status', async () => {
      (http.get as jest.Mock).mockResolvedValue({ enabled: true });

      const result = await service.getStatus().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/chat/status');
    });
  });

  describe('getConversacion', () => {
    it('should get conversation', async () => {
      (http.get as jest.Mock).mockResolvedValue({ data: null });

      const result = await service.getConversacion().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/chat/conversacion');
    });
  });

  describe('getStatusOnce', () => {
    it('should get status once', async () => {
      (http.get as jest.Mock).mockResolvedValue({ enabled: true });

      const result = await service.getStatusOnce();

      expect(result).toEqual({ enabled: true });
    });

    it('should return null on error', async () => {
      (http.get as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await service.getStatusOnce();

      expect(result).toBeNull();
    });
  });
});
