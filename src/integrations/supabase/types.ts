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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organizer_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organizer_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organizer_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      community_answers: {
        Row: {
          community_id: string
          field_key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          community_id: string
          field_key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          community_id?: string
          field_key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "community_answers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_member_history: {
        Row: {
          community_id: string
          completed_at: string | null
          id: string
          intent_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          completed_at?: string | null
          id?: string
          intent_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          completed_at?: string | null
          id?: string
          intent_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_history_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_history_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          intent_id: string | null
          origin_category: string | null
          origin_city: string | null
          requested_by: string
          state: Database["public"]["Enums"]["connection_state"]
          thread_id: string | null
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id?: string | null
          origin_category?: string | null
          origin_city?: string | null
          requested_by: string
          state?: Database["public"]["Enums"]["connection_state"]
          thread_id?: string | null
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string | null
          origin_category?: string | null
          origin_city?: string | null
          requested_by?: string
          state?: Database["public"]["Enums"]["connection_state"]
          thread_id?: string | null
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
            foreignKeyName: "connections_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
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
      intent_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          intent_id: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          intent_id: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          intent_id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_approvals_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
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
      intent_feedback: {
        Row: {
          answers: Json
          creator_id: string
          id: string
          intent_id: string
          met_expectations: number
          participant_id: string
          submitted_at: string
          would_participate_again: Database["public"]["Enums"]["feedback_participate_again"]
          would_recommend:
            | Database["public"]["Enums"]["feedback_recommend"]
            | null
        }
        Insert: {
          answers?: Json
          creator_id: string
          id?: string
          intent_id: string
          met_expectations: number
          participant_id: string
          submitted_at?: string
          would_participate_again: Database["public"]["Enums"]["feedback_participate_again"]
          would_recommend?:
            | Database["public"]["Enums"]["feedback_recommend"]
            | null
        }
        Update: {
          answers?: Json
          creator_id?: string
          id?: string
          intent_id?: string
          met_expectations?: number
          participant_id?: string
          submitted_at?: string
          would_participate_again?: Database["public"]["Enums"]["feedback_participate_again"]
          would_recommend?:
            | Database["public"]["Enums"]["feedback_recommend"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_feedback_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_feedback_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_feedback_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_feedback_requests: {
        Row: {
          creator_id: string
          feedback_requested_at: string
          feedback_submitted_at: string | null
          id: string
          intent_id: string
          participant_id: string
        }
        Insert: {
          creator_id: string
          feedback_requested_at?: string
          feedback_submitted_at?: string | null
          id?: string
          intent_id: string
          participant_id: string
        }
        Update: {
          creator_id?: string
          feedback_requested_at?: string
          feedback_submitted_at?: string | null
          id?: string
          intent_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_feedback_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_feedback_requests_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_feedback_requests_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      intent_journeys: {
        Row: {
          created_at: string
          id: string
          intent_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          intent_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          intent_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intent_journeys_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_participants: {
        Row: {
          confirm_initiated_at: string | null
          confirm_initiated_by: string | null
          created_at: string
          intent_id: string
          interest_at: string
          interest_message: string | null
          joined_at: string | null
          left_at: string | null
          state: Database["public"]["Enums"]["participant_state"]
          user_id: string
        }
        Insert: {
          confirm_initiated_at?: string | null
          confirm_initiated_by?: string | null
          created_at?: string
          intent_id: string
          interest_at?: string
          interest_message?: string | null
          joined_at?: string | null
          left_at?: string | null
          state?: Database["public"]["Enums"]["participant_state"]
          user_id: string
        }
        Update: {
          confirm_initiated_at?: string | null
          confirm_initiated_by?: string | null
          created_at?: string
          intent_id?: string
          interest_at?: string
          interest_message?: string | null
          joined_at?: string | null
          left_at?: string | null
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
      intent_payments: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          intent_id: string
          note: string | null
          reference: string | null
          screenshot_path: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_inr: number
          created_at?: string
          id?: string
          intent_id: string
          note?: string | null
          reference?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          intent_id?: string
          note?: string | null
          reference?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_payments_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_views: {
        Row: {
          id: string
          intent_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          intent_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          intent_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_views_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
        ]
      }
      intents: {
        Row: {
          approval_required: boolean
          category_slug: string
          city: string | null
          closure_reason_code: string | null
          closure_reason_note: string | null
          community_id: string | null
          country: string | null
          created_at: string
          creator_id: string
          creator_visibility: string
          description: string | null
          ends_at: string | null
          expires_at: string
          fulfilled_at: string | null
          fulfilled_note: string | null
          group_discussion_enabled: boolean
          id: string
          join_mode: string
          lat: number | null
          lng: number | null
          locality: string | null
          participation_mode: string
          payment_instructions: string | null
          payment_required: boolean
          people_needed: number
          place_id: string | null
          price_inr: number | null
          radius_km: number
          responses_last_viewed_at: string
          starts_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["intent_status"]
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["intent_visibility"]
          visibility_locked_at: string | null
        }
        Insert: {
          approval_required?: boolean
          category_slug: string
          city?: string | null
          closure_reason_code?: string | null
          closure_reason_note?: string | null
          community_id?: string | null
          country?: string | null
          created_at?: string
          creator_id: string
          creator_visibility?: string
          description?: string | null
          ends_at?: string | null
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_note?: string | null
          group_discussion_enabled?: boolean
          id?: string
          join_mode?: string
          lat?: number | null
          lng?: number | null
          locality?: string | null
          participation_mode?: string
          payment_instructions?: string | null
          payment_required?: boolean
          people_needed?: number
          place_id?: string | null
          price_inr?: number | null
          radius_km?: number
          responses_last_viewed_at?: string
          starts_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["intent_status"]
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["intent_visibility"]
          visibility_locked_at?: string | null
        }
        Update: {
          approval_required?: boolean
          category_slug?: string
          city?: string | null
          closure_reason_code?: string | null
          closure_reason_note?: string | null
          community_id?: string | null
          country?: string | null
          created_at?: string
          creator_id?: string
          creator_visibility?: string
          description?: string | null
          ends_at?: string | null
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_note?: string | null
          group_discussion_enabled?: boolean
          id?: string
          join_mode?: string
          lat?: number | null
          lng?: number | null
          locality?: string | null
          participation_mode?: string
          payment_instructions?: string | null
          payment_required?: boolean
          people_needed?: number
          place_id?: string | null
          price_inr?: number | null
          radius_km?: number
          responses_last_viewed_at?: string
          starts_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["intent_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["intent_visibility"]
          visibility_locked_at?: string | null
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
            foreignKeyName: "intents_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
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
      journey_form_answers: {
        Row: {
          created_at: string
          field_id: string
          field_key: string | null
          file_path: string | null
          id: string
          submission_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          field_key?: string | null
          file_path?: string | null
          id?: string
          submission_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          field_key?: string | null
          file_path?: string | null
          id?: string
          submission_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_form_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "journey_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_form_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "journey_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_form_fields: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          auto_fill: Json
          created_at: string
          created_by: string | null
          default_value: Json | null
          description: string | null
          display_width: string
          field_key: string | null
          help_text: string | null
          id: string
          kind: string
          label: string
          organizer_only: boolean
          placeholder: string | null
          required: boolean
          section_id: string | null
          sort: number
          step_id: string
          updated_at: string
          validation: Json
          visible_if: Json | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          auto_fill?: Json
          created_at?: string
          created_by?: string | null
          default_value?: Json | null
          description?: string | null
          display_width?: string
          field_key?: string | null
          help_text?: string | null
          id?: string
          kind: string
          label: string
          organizer_only?: boolean
          placeholder?: string | null
          required?: boolean
          section_id?: string | null
          sort?: number
          step_id: string
          updated_at?: string
          validation?: Json
          visible_if?: Json | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          auto_fill?: Json
          created_at?: string
          created_by?: string | null
          default_value?: Json | null
          description?: string | null
          display_width?: string
          field_key?: string | null
          help_text?: string | null
          id?: string
          kind?: string
          label?: string
          organizer_only?: boolean
          placeholder?: string | null
          required?: boolean
          section_id?: string | null
          sort?: number
          step_id?: string
          updated_at?: string
          validation?: Json
          visible_if?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_form_fields_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_form_submissions: {
        Row: {
          created_at: string
          form_version: number
          id: string
          intent_id: string
          participant_id: string
          status: string
          step_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_version?: number
          id?: string
          intent_id: string
          participant_id: string
          status?: string
          step_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_version?: number
          id?: string
          intent_id?: string
          participant_id?: string
          status?: string
          step_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_form_submissions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_form_submissions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_form_submissions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          id: string
          intent_id: string
          started_at: string | null
          status: string
          step_id: string
          step_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          intent_id: string
          started_at?: string | null
          status?: string
          step_id: string
          step_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          intent_id?: string
          started_at?: string | null
          status?: string
          step_id?: string
          step_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_progress_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_step_config: {
        Row: {
          config: Json
          step_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          step_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_step_config_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: true
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_steps: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          journey_id: string
          position: number
          type: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          journey_id: string
          position: number
          type: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          journey_id?: string
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_steps_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "intent_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_template_steps: {
        Row: {
          config: Json
          id: string
          position: number
          template_id: string
          type: string
        }
        Insert: {
          config?: Json
          id?: string
          position: number
          template_id: string
          type: string
        }
        Update: {
          config?: Json
          id?: string
          position?: number
          template_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "journey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_templates: {
        Row: {
          created_at: string
          description: string | null
          group: string
          id: string
          name: string
          owner_id: string | null
          recommended_mode: string
          scope: string
          slug: string | null
          source_intent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group: string
          id?: string
          name: string
          owner_id?: string | null
          recommended_mode?: string
          scope?: string
          slug?: string | null
          source_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group?: string
          id?: string
          name?: string
          owner_id?: string | null
          recommended_mode?: string
          scope?: string
          slug?: string | null
          source_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_templates_source_intent_id_fkey"
            columns: ["source_intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
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
          address_line1: string | null
          address_line2: string | null
          bio: string | null
          blood_group: string | null
          city: string | null
          country: string | null
          created_at: string
          dob: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
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
          phone: string | null
          photo_url: string | null
          pincode: string | null
          place_id: string | null
          profession: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bio?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
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
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          place_id?: string | null
          profession?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bio?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
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
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          place_id?: string | null
          profession?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          intent_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          intent_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          intent_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          intent_id: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          intent_id?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          intent_id?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_members: {
        Row: {
          created_at: string
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_read_at?: string
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
      user_reputation_stats: {
        Row: {
          feedback_received: number
          fulfilled_by_category: Json
          intents_closed: number
          intents_created: number
          intents_expired: number
          intents_fulfilled: number
          met_expectations_count: number
          met_expectations_sum: number
          organizer_intents_completed: number
          organizer_intents_total: number
          repeat_connections: number
          repeat_participants: number
          response_count: number
          response_total_seconds: number
          returning_members: number
          total_connections: number
          total_interested_received: number
          total_joined_participants: number
          updated_at: string
          user_id: string
          would_participate_again_definitely: number
          would_participate_again_maybe: number
          would_participate_again_never: number
          would_participate_again_probably: number
          would_participate_again_probably_not: number
          would_recommend_definitely: number
          would_recommend_maybe: number
          would_recommend_never: number
          would_recommend_probably: number
          would_recommend_probably_not: number
        }
        Insert: {
          feedback_received?: number
          fulfilled_by_category?: Json
          intents_closed?: number
          intents_created?: number
          intents_expired?: number
          intents_fulfilled?: number
          met_expectations_count?: number
          met_expectations_sum?: number
          organizer_intents_completed?: number
          organizer_intents_total?: number
          repeat_connections?: number
          repeat_participants?: number
          response_count?: number
          response_total_seconds?: number
          returning_members?: number
          total_connections?: number
          total_interested_received?: number
          total_joined_participants?: number
          updated_at?: string
          user_id: string
          would_participate_again_definitely?: number
          would_participate_again_maybe?: number
          would_participate_again_never?: number
          would_participate_again_probably?: number
          would_participate_again_probably_not?: number
          would_recommend_definitely?: number
          would_recommend_maybe?: number
          would_recommend_never?: number
          would_recommend_probably?: number
          would_recommend_probably_not?: number
        }
        Update: {
          feedback_received?: number
          fulfilled_by_category?: Json
          intents_closed?: number
          intents_created?: number
          intents_expired?: number
          intents_fulfilled?: number
          met_expectations_count?: number
          met_expectations_sum?: number
          organizer_intents_completed?: number
          organizer_intents_total?: number
          repeat_connections?: number
          repeat_participants?: number
          response_count?: number
          response_total_seconds?: number
          returning_members?: number
          total_connections?: number
          total_interested_received?: number
          total_joined_participants?: number
          updated_at?: string
          user_id?: string
          would_participate_again_definitely?: number
          would_participate_again_maybe?: number
          would_participate_again_never?: number
          would_participate_again_probably?: number
          would_participate_again_probably_not?: number
          would_recommend_definitely?: number
          would_recommend_maybe?: number
          would_recommend_never?: number
          would_recommend_probably?: number
          would_recommend_probably_not?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_reputation_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      accept_connection: { Args: { _connection_id: string }; Returns: string }
      can_access_submission: {
        Args: { _submission_id: string; _user_id: string }
        Returns: boolean
      }
      can_see_creator: {
        Args: { _intent_id: string; _viewer: string }
        Returns: boolean
      }
      expire_intents_job: { Args: never; Returns: undefined }
      get_inbox_counts: {
        Args: never
        Returns: {
          received_count: number
          unread_messages: number
        }[]
      }
      get_intents_joined_count: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_my_profile: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["my_profile"]
        SetofOptions: {
          from: "*"
          to: "my_profile"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_new_response_counts: {
        Args: never
        Returns: {
          intent_id: string
          new_count: number
        }[]
      }
      get_response_counts_pending: {
        Args: never
        Returns: {
          intent_id: string
          new_count: number
        }[]
      }
      get_response_counts_total: {
        Args: never
        Returns: {
          intent_id: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_organizer: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_intent_creator: {
        Args: { _intent_id: string; _user_id: string }
        Returns: boolean
      }
      is_step_creator: {
        Args: { _step_id: string; _user_id: string }
        Returns: boolean
      }
      is_thread_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      lock_intent_visibility: {
        Args: { _intent_id: string }
        Returns: undefined
      }
      rep_bump: {
        Args: { _delta?: number; _field: string; _user_id: string }
        Returns: undefined
      }
      rep_bump_category: {
        Args: { _category: string; _delta?: number; _user_id: string }
        Returns: undefined
      }
      rep_log: {
        Args: {
          _event_type: string
          _intent_id: string
          _metadata?: Json
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "user"
      connection_state: "requested" | "accepted" | "declined"
      feedback_participate_again:
        | "definitely"
        | "probably"
        | "maybe"
        | "probably_not"
        | "never"
      feedback_recommend:
        | "definitely"
        | "probably"
        | "maybe"
        | "probably_not"
        | "never"
      intent_status:
        | "open"
        | "closed"
        | "completed"
        | "cancelled"
        | "active"
        | "fulfilled"
        | "expired"
      intent_visibility: "public" | "unlisted"
      participant_state:
        | "interested"
        | "joining"
        | "confirmed"
        | "declined"
        | "left"
      report_reason:
        | "harassment"
        | "inappropriate_content"
        | "safety_concern"
        | "spam"
        | "scam_or_fraud"
        | "other"
      report_status: "open" | "reviewed" | "actioned" | "dismissed"
      thread_kind: "dm" | "intent" | "intent_group"
    }
    CompositeTypes: {
      my_profile: {
        id: string | null
        name: string | null
        photo_url: string | null
        city: string | null
        profession: string | null
        bio: string | null
        languages: string[] | null
        interests: string[] | null
        linkedin_url: string | null
        instagram_url: string | null
        onboarded: boolean | null
        created_at: string | null
        updated_at: string | null
        locality: string | null
        state: string | null
        country: string | null
        lat: number | null
        lng: number | null
        place_id: string | null
        phone: string | null
        dob: string | null
        blood_group: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        address_line1: string | null
        address_line2: string | null
        pincode: string | null
      }
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
      feedback_participate_again: [
        "definitely",
        "probably",
        "maybe",
        "probably_not",
        "never",
      ],
      feedback_recommend: [
        "definitely",
        "probably",
        "maybe",
        "probably_not",
        "never",
      ],
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
      participant_state: [
        "interested",
        "joining",
        "confirmed",
        "declined",
        "left",
      ],
      report_reason: [
        "harassment",
        "inappropriate_content",
        "safety_concern",
        "spam",
        "scam_or_fraud",
        "other",
      ],
      report_status: ["open", "reviewed", "actioned", "dismissed"],
      thread_kind: ["dm", "intent", "intent_group"],
    },
  },
} as const
