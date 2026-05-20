export type AuthenticatedUser = {
  id: string;
  phoneNumber: string;
  roles: string[];
};

export type QueueName = 'notifications' | 'search-indexing';
