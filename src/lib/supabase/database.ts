export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlayerRow = {
  id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      players: {
        Row: PlayerRow;
        Insert: {
          id: string;
          nickname: string;
        };
        Update: {
          nickname: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_room: {
        Args: { p_game_slug: string };
        Returns: Json;
      };
      room_state: {
        Args: { p_code: string };
        Returns: Json;
      };
      join_room: {
        Args: { p_code: string };
        Returns: Json;
      };
      leave_room: {
        Args: { p_code: string };
        Returns: Json;
      };
      queue_state: {
        Args: { p_game_slug: string };
        Returns: Json;
      };
      enqueue: {
        Args: { p_game_slug: string };
        Returns: Json;
      };
      cancel_queue: {
        Args: { p_game_slug: string };
        Returns: Json;
      };
      ensure_room_match: {
        Args: { p_code: string };
        Returns: Json;
      };
      match_state: {
        Args: { p_match: string };
        Returns: Json;
      };
      play_move: {
        Args: {
          p_match: string;
          p_intent: { cell: number } | { column: number } | { hand: string };
        };
        Returns: Json;
      };
      abandon_match: {
        Args: { p_match: string };
        Returns: Json;
      };
      request_rematch: {
        Args: { p_match: string };
        Returns: Json;
      };
      admin_gate: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_overview: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_search: {
        Args: { p_query: string };
        Returns: Json;
      };
      admin_reports: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_audit: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_decide_report: {
        Args: {
          p_report: string;
          p_decision: string;
          p_note: string;
          p_confirmed: boolean;
        };
        Returns: Json;
      };
      admin_revoke_sanction: {
        Args: {
          p_sanction: string;
          p_note: string;
          p_confirmed: boolean;
        };
        Returns: Json;
      };
      file_report: {
        Args: { p_match: string; p_reason: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
