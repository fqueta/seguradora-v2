export interface UserEvent {
  id: number | string;
  user_id: string;
  author_id: string | null;
  event_type: string;
  description: string | null;
  from_data: any;
  to_data: any;
  metadata: any;
  payload: any;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
  };
}
