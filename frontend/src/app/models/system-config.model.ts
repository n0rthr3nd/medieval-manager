export interface SystemConfig {
  _id?: string;
  manuallyClosedOrders: boolean;
  closureMessage: string;
  closedBy?: string;
  closedAt?: Date;
  chatbotGloballyEnabled?: boolean;
  /** @deprecated Replaced by chatbotTokensPerWeek. */
  chatbotMessagesPerWeek?: number;
  /** @deprecated Replaced by chatbotTokensPerWeekAdmin. */
  chatbotMessagesPerWeekAdmin?: number;
  chatbotTokensPerWeek?: number;
  chatbotTokensPerWeekAdmin?: number;
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
  chatbotTokensPerWeek?: number;
  chatbotTokensPerWeekAdmin?: number;
}
