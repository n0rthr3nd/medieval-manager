import { SettingsService } from './settings.service';
import { mockInjects } from '../../../jest.mock.angular';

describe('SettingsService', () => {
  let service: SettingsService;
  let http: any;

  beforeEach(() => {
    http = mockInjects['HttpClient'];
    service = new SettingsService();
    (service as any).apiUrl = 'http://test-api.com';
  });

  describe('getSettings', () => {
    it('should get settings', async () => {
      (http.get as jest.Mock).mockResolvedValue({ success: true, data: { publicRegistrationEnabled: true } });

      const result = await service.getSettings().toPromise();

      expect(http.get).toHaveBeenCalledWith('http://test-api.com/settings');
      expect(result).toEqual({ success: true, data: { publicRegistrationEnabled: true } });
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      (http.put as jest.Mock).mockResolvedValue({ success: true, data: { publicRegistrationEnabled: false } });

      const result = await service.updateSettings({ publicRegistrationEnabled: false }).toPromise();

      expect(http.put).toHaveBeenCalledWith('http://test-api.com/settings', { publicRegistrationEnabled: false });
    });
  });
});
