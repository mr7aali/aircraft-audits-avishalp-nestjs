export interface AuthenticatedUser {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  sessionId: string;
  activeStationId?: string | null;
}
