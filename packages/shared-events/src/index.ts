export const QUEUES = {
  notifications: 'notifications',
  searchIndexing: 'search-indexing',
  savedSearchAlerts: 'saved-search-alerts',
  promotionLifecycle: 'promotion-lifecycle',
  analyticsRollups: 'analytics-rollups',
  paymentFollowups: 'payment-followups',
  subscriptionAlerts: 'subscription-alerts',
  riskFollowups: 'risk-followups',
} as const;

export type NotificationJobPayload = {
  userId: string;
  notificationId?: string;
  channel?: 'in_app' | 'email' | 'sms' | 'push';
  template: string;
  data?: Record<string, unknown>;
};

export type SearchIndexingJobPayload = {
  type: 'index-listing' | 'delete-listing' | 'index-project' | 'delete-project';
  entityId: string;
  publicId?: string;
};

export type SavedSearchAlertJobPayload = {
  savedSearchId: string;
  userId: string;
};

export type PromotionLifecycleJobPayload = {
  action: 'activate-due' | 'end-expired';
};

export type AnalyticsRollupJobPayload = {
  scope: 'listings' | 'projects' | 'all';
  statDate?: string;
};

export type PaymentFollowupJobPayload = {
  transactionId: string;
  action: 'verify' | 'expire';
};

export type SubscriptionAlertJobPayload = {
  subscriptionId?: string;
  action: 'expiry-reminder' | 'mark-expired';
};

export type RiskFollowupJobPayload = {
  riskFlagId: string;
  action: 'review-reminder' | 'escalate';
};
