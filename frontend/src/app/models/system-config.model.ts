export interface SystemConfig {
  _id?: string;
  manuallyClosedOrders: boolean;
  closureMessage: string;
  closedBy?: string;
  closedAt?: Date;
  chatbotGloballyEnabled?: boolean;
  chatbotMessagesPerWeek?: number;
  chatbotMessagesPerWeekAdmin?: number;
  updatedAt?: Date;
}

export interface UpdateOrdersStatusDto {
  manuallyClosedOrders: boolean;
  closureMessage?: string;
}

export interface UpdateChatbotConfigDto {
  chatbotGloballyEnabled?: boolean;
  chatbotMessagesPerWeek?: number;
  chatbotMessagesPerWeekAdmin?: number;
}
