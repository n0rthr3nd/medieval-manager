import {
  getWeekNumber,
  getTargetWeek,
  isWithinOrderWindow,
  getNextFriday,
  getNextMonday,
  getThursdayDeadline,
  getCurrentMonday,
} from './dateUtils';

describe('dateUtils', () => {
  describe('getWeekNumber', () => {
    it('should return correct week number and year for a given date', () => {
      // 2024-01-01 is a Monday
      const date = new Date('2024-01-01');
      const { week, year } = getWeekNumber(date);
      expect(week).toBe(1);
      expect(year).toBe(2024);
    });

    it('should return week 52 for end of year', () => {
      const date = new Date('2023-12-31');
      const { week, year } = getWeekNumber(date);
      expect(week).toBe(52);
    });
  });

  describe('isWithinOrderWindow', () => {
    it('should return true for Friday (all day)', () => {
      // Friday = 5
      const date = new Date('2024-01-12'); // Set to a Friday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Saturday (all day)', () => {
      const date = new Date('2024-01-13'); // Set to a Saturday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Sunday (all day)', () => {
      const date = new Date('2024-01-14'); // Set to a Sunday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Monday (all day)', () => {
      const date = new Date('2024-01-15'); // Set to a Monday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Tuesday (all day)', () => {
      const date = new Date('2024-01-16'); // Set to a Tuesday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Wednesday (all day)', () => {
      const date = new Date('2024-01-17'); // Set to a Wednesday
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Thursday before 17:00', () => {
      // Thursday = 4
      const date = new Date('2024-01-18'); // Set to a Thursday
      date.setHours(16, 30, 0, 0);
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return false for Thursday after 17:00', () => {
      const date = new Date('2024-01-18'); // Set to a Thursday
      date.setHours(18, 0, 0, 0);
      expect(isWithinOrderWindow(date)).toBe(false);
    });

    it('should return true for Thursday at exactly 17:00', () => {
      const date = new Date('2024-01-18'); // Set to a Thursday
      date.setHours(17, 0, 0, 0);
      expect(isWithinOrderWindow(date)).toBe(true);
    });

    it('should return true for Sunday (within window)', () => {
      const date = new Date('2024-01-14'); // Set to a Sunday
      date.setHours(20, 0, 0, 0);
      // Sunday is within the order window
      expect(isWithinOrderWindow(date)).toBe(true);
    });
  });

  describe('getNextFriday', () => {
    it('should return next Friday from Monday', () => {
      const date = new Date('2024-01-08'); // Monday
      const friday = getNextFriday(date);
      expect(friday.getDay()).toBe(5); // Friday
      expect(friday.getDate()).toBe(12); // Jan 12, 2024
    });

    it('should return next Friday if today is Friday', () => {
      const date = new Date('2024-01-12'); // Friday
      const friday = getNextFriday(date);
      expect(friday.getDay()).toBe(5);
      expect(friday.getDate()).toBe(19); // Next Friday
    });

    it('should reset time to 00:00:00', () => {
      const date = new Date('2024-01-08T15:30:45');
      const friday = getNextFriday(date);
      expect(friday.getHours()).toBe(0);
      expect(friday.getMinutes()).toBe(0);
      expect(friday.getSeconds()).toBe(0);
    });
  });

  describe('getThursdayDeadline', () => {
    it('should return this Thursday at 17:00 if called on Monday', () => {
      const date = new Date('2024-01-08'); // Monday
      const deadline = getThursdayDeadline(date);
      expect(deadline.getDay()).toBe(4); // Thursday
      expect(deadline.getHours()).toBe(17);
      expect(deadline.getMinutes()).toBe(0);
    });

    it('should return this Thursday at 17:00 if called on Thursday before deadline', () => {
      const date = new Date('2024-01-11T10:00:00'); // Thursday
      const deadline = getThursdayDeadline(date);
      expect(deadline.getDay()).toBe(4);
      expect(deadline.getDate()).toBe(11); // Same Thursday
    });
  });

  describe('getCurrentMonday', () => {
    it('should return the Monday of the current week', () => {
      const date = new Date('2024-01-10'); // Wednesday
      const monday = getCurrentMonday(date);
      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(8); // Jan 8, 2024
    });
  });

  describe('getTargetWeek', () => {
    it('should return the week number of the next Friday', () => {
      // Friday = 5, Saturday = 6
      const date = new Date('2024-01-13'); // Saturday - should target next Friday (Jan 19)
      const { week, year } = getTargetWeek(date);
      expect(week).toBe(3); // Jan 19 is in week 3 of 2024
      expect(year).toBe(2024);
    });

    it('should return the same week if called on Friday', () => {
      const date = new Date('2024-01-12'); // Friday
      const { week, year } = getTargetWeek(date);
      // Next Friday is Jan 19, which is week 3
      expect(week).toBe(3);
    });

    it('should return correct year when crossing year boundary', () => {
      // If today is late December and next Friday is in January of next year
      const date = new Date('2023-12-30'); // Saturday
      const { week, year } = getTargetWeek(date);
      // Next Friday is Jan 5, 2024 which is week 1 of 2024
      expect(year).toBe(2024);
    });
  });
});
