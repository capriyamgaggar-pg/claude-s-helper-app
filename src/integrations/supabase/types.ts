export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          created_at: string
          id: string
          intent_id: string | null
          requested_by: string
          state: Database["public"]["Enums"]["connection_state"]
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id?: string | null
          requested_by: string
          state?: Database["public"]["Enums"]["connection_state"]
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string | null
          requested_by?: string
          state?: Database["public"]["Enums"]["connection_state"]
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_categories: {
        Row: {
          icon: string | null
          label: string
          slug: string
          sort: number
        }
        Insert: {
          icon?: string | null
          label: string
          slug: string
          sort?: number
        }
        Update: {
          icon?: string | null
          label?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      intent_fulfillments: {
        Row: {
          created_at: string
          id: string
          intent_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_fulfillments_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_participants: {
        Row: {
          created_at: string
          intent_id: string
          state: Database["public"]["Enums"]["participant_state"]
          user_id: string
        }
        Insert: {
          created_at?: string
          intent_id: string
          state?: Database["public"]["Enums"]["participant_state"]
          user_id: string
        }
        Update: {
          created_at?: string
          intent_id?: string
          state?: Database["public"]["Enums"]["participant_state"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_participants_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intents: {
        Row: {
          category_slug: string
          city: string | null
          closure_reason_code: string | null
          closure_reason_note: string | null
          country: string | null
          created_at: string
          creator_id: string
          description: string | null
          ends_at: string | null
          expires_at: string
          fulfilled_at: string | null
          fulfilled_note: string | null
          id: string
          lat: number | null
          lng: number | null
          locality: string | null
          people_needed: number
          place_id: string | null
          radius_km: number
          starts_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["intent_status"]
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["intent_visibility"]
        }
        Insert: {
          category_slug: string
          city?: string | null
          closure_reason_code?: string | null
          closure_reason_note?: string | null
          country?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          ends_at?: string | null
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_note?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          locality?: string | null
          people_needed?: number
          place_id?: string | null
          radius_km?: number
          starts_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["intent_status"]
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["intent_visibility"]
        }
        Update: {
          category_slug?: string
          city?: string | null
          closure_reason_code?: string | null
          closure_reason_note?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          ends_at?: string | null
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_note?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          locality?: string | null
          people_needed?: number
          place_id?: string | null
          radius_km?: number
          starts_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["intent_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["intent_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "intents_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "intent_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "intents_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          instagram_url: string | null
          interests: string[]
          languages: string[]
          lat: number | null
          linkedin_url: string | null
          lng: number | null
          locality: string | null
          name: string | null
          onboarded: boolean
          photo_url: string | null
          place_id: string | null
          profession: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id: string
          instagram_url?: string | null
          interests?: string[]
          languages?: string[]
          lat?: number | null
          linkedin_url?: string | null
          lng?: number | null
          locality?: string | null
          name?: string | null
          onboarded?: boolean
          photo_url?: string | null
          place_id?: string | null
          profession?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          interests?: string[]
          languages?: string[]
          lat?: number | null
          linkedin_url?: string | null
          lng?: number | null
          locality?: string | null
          name?: string | null
          onboarded?: boolean
          photo_url?: string | null
          place_id?: string | null
          profession?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      thread_members: {
        Row: {
          created_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          intent_id: string | null
          kind: Database["public"]["Enums"]["thread_kind"]
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id?: string | null
          kind?: Database["public"]["Enums"]["thread_kind"]
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string | null
          kind?: Database["public"]["Enums"]["thread_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "threads_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_intents_job: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_intent_creator: {
        Args: { _intent_id: string; _user_id: string }
        Returns: boolean
      }
      is_thread_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "user"
      connection_state: "requested" | "accepted" | "declined"
      intent_status:
        | "open"
        | "closed"
        | "completed"
        | "cancelled"
        | "active"
        | "fulfilled"
        | "expired"
      intent_visibility: "public" | "unlisted"
      participant_state: "interested" | "joining" | "confirmed" | "declined"
      thread_kind: "dm" | "intent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "organizer", "user"],
      connection_state: ["requested", "accepted", "declined"],
      intent_status: [
        "open",
        "closed",
        "completed",
        "cancelled",
        "active",
        "fulfilled",
        "expired",
      ],
      intent_visibility: ["public", "unlisted"],
      participant_state: ["interested", "joining", "confirmed", "declined"],
      thread_kind: ["dm", "intent"],
    },
  },
} as const
