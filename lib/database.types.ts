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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_draft_enhancement_jobs: {
        Row: {
          attempt_count: number
          auto_send_requested: boolean
          base_content_revision: number
          completed_at: string | null
          created_at: string
          creator_id: string
          creator_update_id: string
          failed_at: string | null
          id: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          preferred_variant: string
          prompt_version: string
          requested_variants: string[]
          result_applied: boolean
          source_event_type: string | null
          source_object_type: string | null
          source_provider: string | null
          stale_result: boolean
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          auto_send_requested?: boolean
          base_content_revision: number
          completed_at?: string | null
          created_at?: string
          creator_id: string
          creator_update_id: string
          failed_at?: string | null
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          preferred_variant: string
          prompt_version: string
          requested_variants: string[]
          result_applied?: boolean
          source_event_type?: string | null
          source_object_type?: string | null
          source_provider?: string | null
          stale_result?: boolean
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          auto_send_requested?: boolean
          base_content_revision?: number
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          creator_update_id?: string
          failed_at?: string | null
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          preferred_variant?: string
          prompt_version?: string
          requested_variants?: string[]
          result_applied?: boolean
          source_event_type?: string | null
          source_object_type?: string | null
          source_provider?: string | null
          stale_result?: boolean
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_draft_enhancement_jobs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_enhancement_jobs_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_draft_variants: {
        Row: {
          body: string
          call_to_action: string | null
          created_at: string
          creator_id: string
          creator_update_id: string
          enhancement_job_id: string
          estimated_cost_minor_units: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          selected: boolean
          source_url: string | null
          title: string
          variant_type: string
        }
        Insert: {
          body: string
          call_to_action?: string | null
          created_at?: string
          creator_id: string
          creator_update_id: string
          enhancement_job_id: string
          estimated_cost_minor_units?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          selected?: boolean
          source_url?: string | null
          title: string
          variant_type: string
        }
        Update: {
          body?: string
          call_to_action?: string | null
          created_at?: string
          creator_id?: string
          creator_update_id?: string
          enhancement_job_id?: string
          estimated_cost_minor_units?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          selected?: boolean
          source_url?: string | null
          title?: string
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_draft_variants_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_variants_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_variants_enhancement_job_id_fkey"
            columns: ["enhancement_job_id"]
            isOneToOne: false
            referencedRelation: "ai_draft_enhancement_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          created_at: string
          creator_id: string
          enhancement_job_id: string
          error_code: string | null
          estimated_cost_minor_units: number | null
          id: string
          input_tokens: number | null
          model: string
          operation: string
          output_tokens: number | null
          provider: string
          success: boolean
        }
        Insert: {
          created_at?: string
          creator_id: string
          enhancement_job_id: string
          error_code?: string | null
          estimated_cost_minor_units?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          operation: string
          output_tokens?: number | null
          provider: string
          success: boolean
        }
        Update: {
          created_at?: string
          creator_id?: string
          enhancement_job_id?: string
          error_code?: string | null
          estimated_cost_minor_units?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          operation?: string
          output_tokens?: number | null
          provider?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_enhancement_job_id_fkey"
            columns: ["enhancement_job_id"]
            isOneToOne: false
            referencedRelation: "ai_draft_enhancement_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_admins: {
        Row: {
          created_at: string
          created_by: string | null
          display_email: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_email?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_email?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      authenticity_network_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          failed_at: string | null
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string | null
          payload: Json
          payload_hash: string
          response_status: number | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id: string
          event_type: string
          failed_at?: string | null
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_attempt_at?: string | null
          payload: Json
          payload_hash: string
          response_status?: number | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_attempt_at?: string | null
          payload?: Json
          payload_hash?: string
          response_status?: number | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authenticity_network_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "authenticity_network_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      authenticity_network_subscriptions: {
        Row: {
          challenge_expires_at: string | null
          challenge_hash: string | null
          created_at: string
          creator_id: string
          disabled_at: string | null
          endpoint_host: string
          endpoint_url: string
          event_types: string[]
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          next_attempt_at: string | null
          owner_user_id: string
          secret_ciphertext: string
          status: string
          updated_at: string
        }
        Insert: {
          challenge_expires_at?: string | null
          challenge_hash?: string | null
          created_at?: string
          creator_id: string
          disabled_at?: string | null
          endpoint_host: string
          endpoint_url: string
          event_types: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          next_attempt_at?: string | null
          owner_user_id: string
          secret_ciphertext: string
          status?: string
          updated_at?: string
        }
        Update: {
          challenge_expires_at?: string | null
          challenge_hash?: string | null
          created_at?: string
          creator_id?: string
          disabled_at?: string | null
          endpoint_host?: string
          endpoint_url?: string
          event_types?: string[]
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          next_attempt_at?: string | null
          owner_user_id?: string
          secret_ciphertext?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authenticity_network_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      authenticity_signing_keys: {
        Row: {
          active: boolean
          algorithm: string
          created_at: string
          key_id: string
          not_before: string
          public_jwk: Json
          retire_after: string | null
          revoked_at: string | null
        }
        Insert: {
          active?: boolean
          algorithm?: string
          created_at?: string
          key_id: string
          not_before?: string
          public_jwk: Json
          retire_after?: string | null
          revoked_at?: string | null
        }
        Update: {
          active?: boolean
          algorithm?: string
          created_at?: string
          key_id?: string
          not_before?: string
          public_jwk?: Json
          retire_after?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      browser_push_subscriptions: {
        Row: {
          auth_ciphertext: string
          created_at: string
          endpoint_ciphertext: string
          endpoint_hash: string
          expiration_time: string | null
          failure_count: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          p256dh_ciphertext: string
          recovery_method_id: string
          revoked_at: string | null
          updated_at: string
          user_agent_summary: string | null
        }
        Insert: {
          auth_ciphertext: string
          created_at?: string
          endpoint_ciphertext: string
          endpoint_hash: string
          expiration_time?: string | null
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh_ciphertext: string
          recovery_method_id: string
          revoked_at?: string | null
          updated_at?: string
          user_agent_summary?: string | null
        }
        Update: {
          auth_ciphertext?: string
          created_at?: string
          endpoint_ciphertext?: string
          endpoint_hash?: string
          expiration_time?: string | null
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh_ciphertext?: string
          recovery_method_id?: string
          revoked_at?: string | null
          updated_at?: string
          user_agent_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "browser_push_subscriptions_recovery_method_id_fkey"
            columns: ["recovery_method_id"]
            isOneToOne: true
            referencedRelation: "follower_recovery_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }
        Insert: {
          account_type: string
          auto_create_drafts?: boolean
          auto_send?: boolean
          capability_state?: Json
          connection_health?: string
          created_at?: string
          creator_id: string
          external_account_id?: string | null
          external_account_name?: string | null
          external_account_url?: string | null
          granted_scopes?: string[]
          id?: string
          is_primary?: boolean
          is_public?: boolean
          label: string
          last_connection_error?: string | null
          last_external_cursor?: string | null
          last_sync_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_sync_at?: string | null
          platform: string
          poll_claimed_until?: string | null
          position?: number
          protected_official_account_id?: string | null
          provider_metadata?: Json
          provider_status?: string
          requested_scopes?: string[]
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          updated_at?: string
          url: string
          watch_enabled?: boolean
          webhook_enabled?: boolean
        }
        Update: {
          account_type?: string
          auto_create_drafts?: boolean
          auto_send?: boolean
          capability_state?: Json
          connection_health?: string
          created_at?: string
          creator_id?: string
          external_account_id?: string | null
          external_account_name?: string | null
          external_account_url?: string | null
          granted_scopes?: string[]
          id?: string
          is_primary?: boolean
          is_public?: boolean
          label?: string
          last_connection_error?: string | null
          last_external_cursor?: string | null
          last_sync_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_sync_at?: string | null
          platform?: string
          poll_claimed_until?: string | null
          position?: number
          protected_official_account_id?: string | null
          provider_metadata?: Json
          provider_status?: string
          requested_scopes?: string[]
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          updated_at?: string
          url?: string
          watch_enabled?: boolean
          webhook_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_accounts_protected_official_account_id_fkey"
            columns: ["protected_official_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_activity: {
        Row: {
          activity_type: string
          body: string
          created_at: string
          creator_id: string
          creator_update_id: string | null
          id: string
          read_at: string | null
          title: string
        }
        Insert: {
          activity_type: string
          body: string
          created_at?: string
          creator_id: string
          creator_update_id?: string | null
          id?: string
          read_at?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          body?: string
          created_at?: string
          creator_id?: string
          creator_update_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_activity_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_activity_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_ai_settings: {
        Row: {
          ai_auto_send_enabled: boolean
          ai_required: boolean
          approval_required: boolean
          audience_description: string
          created_at: string
          creator_id: string
          cta_style: string
          custom_voice_instructions: string
          enabled: boolean
          include_emojis: boolean
          include_hashtags: boolean
          monthly_budget_minor_units: number
          monthly_generation_limit: number
          phrases_to_avoid: string
          preferred_model: string
          preferred_terminology: string
          preferred_variant: string
          preserve_source_title: boolean
          provider: string
          tone: string
          updated_at: string
        }
        Insert: {
          ai_auto_send_enabled?: boolean
          ai_required?: boolean
          approval_required?: boolean
          audience_description?: string
          created_at?: string
          creator_id: string
          cta_style?: string
          custom_voice_instructions?: string
          enabled?: boolean
          include_emojis?: boolean
          include_hashtags?: boolean
          monthly_budget_minor_units?: number
          monthly_generation_limit?: number
          phrases_to_avoid?: string
          preferred_model?: string
          preferred_terminology?: string
          preferred_variant?: string
          preserve_source_title?: boolean
          provider?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          ai_auto_send_enabled?: boolean
          ai_required?: boolean
          approval_required?: boolean
          audience_description?: string
          created_at?: string
          creator_id?: string
          cta_style?: string
          custom_voice_instructions?: string
          enabled?: boolean
          include_emojis?: boolean
          include_hashtags?: boolean
          monthly_budget_minor_units?: number
          monthly_generation_limit?: number
          phrases_to_avoid?: string
          preferred_model?: string
          preferred_terminology?: string
          preferred_variant?: string
          preserve_source_title?: boolean
          provider?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_ai_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_authenticity_assertions: {
        Row: {
          algorithm: string
          assertion_version: string
          authenticity_profile_id: string
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          identity_profile_id: string
          identity_revision: number
          issued_at: string
          key_id: string
          payload: Json
          payload_hash: string
          presentation_revision: number
          revoked_at: string | null
          signature: string
          superseded_at: string | null
          trust_policy_version: string
          trust_state: string
        }
        Insert: {
          algorithm?: string
          assertion_version: string
          authenticity_profile_id: string
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          identity_profile_id: string
          identity_revision: number
          issued_at: string
          key_id: string
          payload: Json
          payload_hash: string
          presentation_revision: number
          revoked_at?: string | null
          signature: string
          superseded_at?: string | null
          trust_policy_version: string
          trust_state: string
        }
        Update: {
          algorithm?: string
          assertion_version?: string
          authenticity_profile_id?: string
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          identity_profile_id?: string
          identity_revision?: number
          issued_at?: string
          key_id?: string
          payload?: Json
          payload_hash?: string
          presentation_revision?: number
          revoked_at?: string | null
          signature?: string
          superseded_at?: string | null
          trust_policy_version?: string
          trust_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_authenticity_assertions_authenticity_profile_id_fkey"
            columns: ["authenticity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_assertions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_assertions_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_authenticity_events: {
        Row: {
          actor_user_id: string | null
          assertion_id: string | null
          authenticity_profile_id: string
          created_at: string
          creator_id: string
          event_type: string
          id: number
          identity_profile_id: string
          metadata: Json
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          assertion_id?: string | null
          authenticity_profile_id: string
          created_at?: string
          creator_id: string
          event_type: string
          id?: never
          identity_profile_id: string
          metadata?: Json
          source: string
        }
        Update: {
          actor_user_id?: string | null
          assertion_id?: string | null
          authenticity_profile_id?: string
          created_at?: string
          creator_id?: string
          event_type?: string
          id?: never
          identity_profile_id?: string
          metadata?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_authenticity_events_assertion_id_fkey"
            columns: ["assertion_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_assertions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_events_authenticity_profile_id_fkey"
            columns: ["authenticity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_events_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_authenticity_manifests: {
        Row: {
          assertion_id: string | null
          authenticity_profile_id: string
          created_at: string
          creator_id: string
          expires_at: string | null
          generated_at: string
          id: string
          identity_revision: number
          manifest_version: string
          payload: Json
          payload_hash: string
          presentation_revision: number
          revoked_at: string | null
          superseded_at: string | null
        }
        Insert: {
          assertion_id?: string | null
          authenticity_profile_id: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          generated_at: string
          id?: string
          identity_revision: number
          manifest_version: string
          payload: Json
          payload_hash: string
          presentation_revision: number
          revoked_at?: string | null
          superseded_at?: string | null
        }
        Update: {
          assertion_id?: string | null
          authenticity_profile_id?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          generated_at?: string
          id?: string
          identity_revision?: number
          manifest_version?: string
          payload?: Json
          payload_hash?: string
          presentation_revision?: number
          revoked_at?: string | null
          superseded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_authenticity_manifests_assertion_id_fkey"
            columns: ["assertion_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_assertions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_manifests_authenticity_profile_id_fkey"
            columns: ["authenticity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_manifests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_authenticity_profiles: {
        Row: {
          created_at: string
          creator_id: string
          display_enabled: boolean
          embed_enabled: boolean
          id: string
          identity_profile_id: string
          issuance_lease_expires_at: string | null
          issuance_lease_owner: string | null
          presentation_revision: number
          public_slug: string
          public_summary: string | null
          public_title: string | null
          qr_enabled: boolean
          show_relationship_history: boolean
          show_verified_timestamps: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          display_enabled?: boolean
          embed_enabled?: boolean
          id?: string
          identity_profile_id: string
          issuance_lease_expires_at?: string | null
          issuance_lease_owner?: string | null
          presentation_revision?: number
          public_slug: string
          public_summary?: string | null
          public_title?: string | null
          qr_enabled?: boolean
          show_relationship_history?: boolean
          show_verified_timestamps?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          display_enabled?: boolean
          embed_enabled?: boolean
          id?: string
          identity_profile_id?: string
          issuance_lease_expires_at?: string | null
          issuance_lease_owner?: string | null
          presentation_revision?: number
          public_slug?: string
          public_summary?: string | null
          public_title?: string | null
          qr_enabled?: boolean
          show_relationship_history?: boolean
          show_verified_timestamps?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_authenticity_profiles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_profiles_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: true
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_authenticity_views: {
        Row: {
          api_requests: number
          assertion_requests: number
          assertion_verification_failures: number
          authenticity_profile_id: string
          badge_views: number
          card_views: number
          continuity_requests: number
          created_at: string
          creator_id: string
          day: string
          domain_clicks: number
          domain_discovery_checks: number
          emergency_replacement_clicks: number
          event_feed_requests: number
          lookup_matched: number
          lookup_requests: number
          lookup_unmatched: number
          manifest_requests: number
          official_account_clicks: number
          page_views: number
          qr_resolutions: number
          sdk_requests: number
          signed_lookup_requests: number
          updated_at: string
          verification_clicks: number
          webhook_deliveries: number
          webhook_failures: number
        }
        Insert: {
          api_requests?: number
          assertion_requests?: number
          assertion_verification_failures?: number
          authenticity_profile_id: string
          badge_views?: number
          card_views?: number
          continuity_requests?: number
          created_at?: string
          creator_id: string
          day: string
          domain_clicks?: number
          domain_discovery_checks?: number
          emergency_replacement_clicks?: number
          event_feed_requests?: number
          lookup_matched?: number
          lookup_requests?: number
          lookup_unmatched?: number
          manifest_requests?: number
          official_account_clicks?: number
          page_views?: number
          qr_resolutions?: number
          sdk_requests?: number
          signed_lookup_requests?: number
          updated_at?: string
          verification_clicks?: number
          webhook_deliveries?: number
          webhook_failures?: number
        }
        Update: {
          api_requests?: number
          assertion_requests?: number
          assertion_verification_failures?: number
          authenticity_profile_id?: string
          badge_views?: number
          card_views?: number
          continuity_requests?: number
          created_at?: string
          creator_id?: string
          day?: string
          domain_clicks?: number
          domain_discovery_checks?: number
          emergency_replacement_clicks?: number
          event_feed_requests?: number
          lookup_matched?: number
          lookup_requests?: number
          lookup_unmatched?: number
          manifest_requests?: number
          official_account_clicks?: number
          page_views?: number
          qr_resolutions?: number
          sdk_requests?: number
          signed_lookup_requests?: number
          updated_at?: string
          verification_clicks?: number
          webhook_deliveries?: number
          webhook_failures?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_authenticity_views_authenticity_profile_id_fkey"
            columns: ["authenticity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_authenticity_views_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_billing_subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          creator_id: string
          current_period_end: string | null
          current_period_start: string | null
          last_stripe_event_created: number
          plan: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          creator_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          last_stripe_event_created?: number
          plan?: string
          status?: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          creator_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          last_stripe_event_created?: number
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_billing_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_continuity_statements: {
        Row: {
          authenticity_profile_id: string
          created_at: string
          creator_id: string
          current_identity_account_id: string | null
          current_public_url: string | null
          expires_at: string | null
          id: string
          issued_at: string
          key_id: string
          payload: Json
          payload_hash: string
          previous_identity_account_id: string | null
          previous_public_url: string | null
          provider: string
          reason_code: string
          revoked_at: string | null
          signature: string
          source_identity_revision: number
          statement_type: string
          statement_version: string
          superseded_at: string | null
        }
        Insert: {
          authenticity_profile_id: string
          created_at?: string
          creator_id: string
          current_identity_account_id?: string | null
          current_public_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at: string
          key_id: string
          payload: Json
          payload_hash: string
          previous_identity_account_id?: string | null
          previous_public_url?: string | null
          provider: string
          reason_code: string
          revoked_at?: string | null
          signature: string
          source_identity_revision: number
          statement_type: string
          statement_version: string
          superseded_at?: string | null
        }
        Update: {
          authenticity_profile_id?: string
          created_at?: string
          creator_id?: string
          current_identity_account_id?: string | null
          current_public_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          key_id?: string
          payload?: Json
          payload_hash?: string
          previous_identity_account_id?: string | null
          previous_public_url?: string | null
          provider?: string
          reason_code?: string
          revoked_at?: string | null
          signature?: string
          source_identity_revision?: number
          statement_type?: string
          statement_version?: string
          superseded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_continuity_statements_authenticity_profile_id_fkey"
            columns: ["authenticity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_authenticity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_continuity_statements_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_continuity_statements_current_identity_account_id_fkey"
            columns: ["current_identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_continuity_statements_previous_identity_account_id_fkey"
            columns: ["previous_identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_ecosystem_destinations: {
        Row: {
          archived_at: string | null
          auto_apply_safe_changes: boolean
          automation_enabled: boolean
          automation_pause_reason: string | null
          automation_paused_at: string | null
          canonical_url: string
          capabilities: Json
          consecutive_failures: number
          created_at: string
          creator_id: string
          current_fingerprint: string | null
          destination_type: string
          display_handle: string | null
          display_name: string
          first_verified_at: string | null
          hostname: string
          id: string
          identity_profile_id: string
          last_attempted_sync_at: string | null
          last_authoritative_event_at: string | null
          last_failure_class: string | null
          last_failure_code: string | null
          last_observed_fingerprint: string | null
          last_revalidated_at: string | null
          last_successful_sync_at: string | null
          last_sync_error_code: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          next_revalidation_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_type: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_identity_account_id: string | null
          stable_external_id: string | null
          sync_attempts: number
          sync_lease_expires_at: string | null
          sync_lease_owner: string | null
          sync_priority: string
          sync_revision: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_expires_at: string | null
          verification_method: string | null
          verification_status: string
        }
        Insert: {
          archived_at?: string | null
          auto_apply_safe_changes?: boolean
          automation_enabled?: boolean
          automation_pause_reason?: string | null
          automation_paused_at?: string | null
          canonical_url: string
          capabilities?: Json
          consecutive_failures?: number
          created_at?: string
          creator_id: string
          current_fingerprint?: string | null
          destination_type: string
          display_handle?: string | null
          display_name: string
          first_verified_at?: string | null
          hostname: string
          id?: string
          identity_profile_id: string
          last_attempted_sync_at?: string | null
          last_authoritative_event_at?: string | null
          last_failure_class?: string | null
          last_failure_code?: string | null
          last_observed_fingerprint?: string | null
          last_revalidated_at?: string | null
          last_successful_sync_at?: string | null
          last_sync_error_code?: string | null
          last_synced_at?: string | null
          last_verified_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          metadata?: Json
          next_revalidation_at?: string | null
          next_sync_at?: string | null
          official?: boolean
          primary_for_type?: boolean
          provider: string
          public_visible?: boolean
          revoked_at?: string | null
          source_connection_id?: string | null
          source_identity_account_id?: string | null
          stable_external_id?: string | null
          sync_attempts?: number
          sync_lease_expires_at?: string | null
          sync_lease_owner?: string | null
          sync_priority?: string
          sync_revision?: number
          sync_status?: string
          updated_at?: string
          verification_confidence?: string | null
          verification_expires_at?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Update: {
          archived_at?: string | null
          auto_apply_safe_changes?: boolean
          automation_enabled?: boolean
          automation_pause_reason?: string | null
          automation_paused_at?: string | null
          canonical_url?: string
          capabilities?: Json
          consecutive_failures?: number
          created_at?: string
          creator_id?: string
          current_fingerprint?: string | null
          destination_type?: string
          display_handle?: string | null
          display_name?: string
          first_verified_at?: string | null
          hostname?: string
          id?: string
          identity_profile_id?: string
          last_attempted_sync_at?: string | null
          last_authoritative_event_at?: string | null
          last_failure_class?: string | null
          last_failure_code?: string | null
          last_observed_fingerprint?: string | null
          last_revalidated_at?: string | null
          last_successful_sync_at?: string | null
          last_sync_error_code?: string | null
          last_synced_at?: string | null
          last_verified_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          metadata?: Json
          next_revalidation_at?: string | null
          next_sync_at?: string | null
          official?: boolean
          primary_for_type?: boolean
          provider?: string
          public_visible?: boolean
          revoked_at?: string | null
          source_connection_id?: string | null
          source_identity_account_id?: string | null
          stable_external_id?: string | null
          sync_attempts?: number
          sync_lease_expires_at?: string | null
          sync_lease_owner?: string | null
          sync_priority?: string
          sync_revision?: number
          sync_status?: string
          updated_at?: string
          verification_confidence?: string | null
          verification_expires_at?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_ecosystem_destinations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_destinations_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_destinations_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_destinations_source_identity_account_id_fkey"
            columns: ["source_identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_ecosystem_relationships: {
        Row: {
          confidence: string | null
          created_at: string
          creator_id: string
          id: string
          identity_account_id: string | null
          identity_domain_id: string | null
          identity_profile_id: string
          relationship_type: string
          revoked_at: string | null
          source: string
          source_destination_id: string | null
          status: string
          target_destination_id: string | null
          verified_at: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          creator_id: string
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          identity_profile_id: string
          relationship_type: string
          revoked_at?: string | null
          source: string
          source_destination_id?: string | null
          status?: string
          target_destination_id?: string | null
          verified_at?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          identity_profile_id?: string
          relationship_type?: string
          revoked_at?: string | null
          source?: string
          source_destination_id?: string | null
          status?: string
          target_destination_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_ecosystem_relationships_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_relationships_identity_account_id_fkey"
            columns: ["identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_relationships_identity_domain_id_fkey"
            columns: ["identity_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_relationships_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_relationships_source_destination_id_fkey"
            columns: ["source_destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ecosystem_relationships_target_destination_id_fkey"
            columns: ["target_destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_emergencies: {
        Row: {
          activated_at: string | null
          approved_revision: number | null
          cancelled_at: string | null
          content_revision: number
          created_at: string
          creation_key: string | null
          creator_id: string
          creator_update_id: string | null
          emergency_type: string
          id: string
          lifecycle_status: string
          message: string
          requested_by: string
          resolved_at: string | null
          severity: string
          source_plan_id: string | null
          source_template_id: string | null
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          approved_revision?: number | null
          cancelled_at?: string | null
          content_revision?: number
          created_at?: string
          creation_key?: string | null
          creator_id: string
          creator_update_id?: string | null
          emergency_type: string
          id?: string
          lifecycle_status?: string
          message: string
          requested_by: string
          resolved_at?: string | null
          severity?: string
          source_plan_id?: string | null
          source_template_id?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          approved_revision?: number | null
          cancelled_at?: string | null
          content_revision?: number
          created_at?: string
          creation_key?: string | null
          creator_id?: string
          creator_update_id?: string | null
          emergency_type?: string
          id?: string
          lifecycle_status?: string
          message?: string
          requested_by?: string
          resolved_at?: string | null
          severity?: string
          source_plan_id?: string | null
          source_template_id?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_emergencies_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_emergencies_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_emergencies_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "emergency_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_emergencies_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "emergency_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identity_accounts: {
        Row: {
          account_kind: string
          archived_at: string | null
          canonical_profile_url: string
          created_at: string
          creator_id: string
          display_handle: string | null
          display_name: string | null
          first_verified_at: string | null
          id: string
          identity_profile_id: string
          last_revalidated_at: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          monitor_attempts: number
          monitor_lease_expires_at: string | null
          monitor_lease_owner: string | null
          monitoring_fingerprint: string | null
          next_monitor_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_provider: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_replacement_account_id: string | null
          stable_provider_account_id: string
          sync_attempts: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_method: string | null
          verification_status: string
        }
        Insert: {
          account_kind: string
          archived_at?: string | null
          canonical_profile_url: string
          created_at?: string
          creator_id: string
          display_handle?: string | null
          display_name?: string | null
          first_verified_at?: string | null
          id?: string
          identity_profile_id: string
          last_revalidated_at?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          last_verified_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          metadata?: Json
          monitor_attempts?: number
          monitor_lease_expires_at?: string | null
          monitor_lease_owner?: string | null
          monitoring_fingerprint?: string | null
          next_monitor_at?: string | null
          next_sync_at?: string | null
          official?: boolean
          primary_for_provider?: boolean
          provider: string
          public_visible?: boolean
          revoked_at?: string | null
          source_connection_id?: string | null
          source_replacement_account_id?: string | null
          stable_provider_account_id: string
          sync_attempts?: number
          sync_status?: string
          updated_at?: string
          verification_confidence?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Update: {
          account_kind?: string
          archived_at?: string | null
          canonical_profile_url?: string
          created_at?: string
          creator_id?: string
          display_handle?: string | null
          display_name?: string | null
          first_verified_at?: string | null
          id?: string
          identity_profile_id?: string
          last_revalidated_at?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          last_verified_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          metadata?: Json
          monitor_attempts?: number
          monitor_lease_expires_at?: string | null
          monitor_lease_owner?: string | null
          monitoring_fingerprint?: string | null
          next_monitor_at?: string | null
          next_sync_at?: string | null
          official?: boolean
          primary_for_provider?: boolean
          provider?: string
          public_visible?: boolean
          revoked_at?: string | null
          source_connection_id?: string | null
          source_replacement_account_id?: string | null
          stable_provider_account_id?: string
          sync_attempts?: number
          sync_status?: string
          updated_at?: string
          verification_confidence?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_identity_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_accounts_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_accounts_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_accounts_source_replacement_account_id_fkey"
            columns: ["source_replacement_account_id"]
            isOneToOne: false
            referencedRelation: "emergency_replacement_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identity_domains: {
        Row: {
          canonical_url: string
          created_at: string
          creator_id: string
          discovery_checked_at: string | null
          discovery_lease_expires_at: string | null
          discovery_lease_owner: string | null
          discovery_next_check_at: string | null
          discovery_status: string
          first_verified_at: string | null
          hostname: string
          id: string
          identity_profile_id: string
          last_checked_at: string | null
          last_verified_at: string | null
          monitor_attempts: number
          monitor_lease_expires_at: string | null
          monitor_lease_owner: string | null
          monitoring_fingerprint: string | null
          next_monitor_at: string | null
          official: boolean
          primary_domain: boolean
          public_visible: boolean
          revoked_at: string | null
          updated_at: string
          verification_confidence: string | null
          verification_method: string | null
          verification_status: string
        }
        Insert: {
          canonical_url: string
          created_at?: string
          creator_id: string
          discovery_checked_at?: string | null
          discovery_lease_expires_at?: string | null
          discovery_lease_owner?: string | null
          discovery_next_check_at?: string | null
          discovery_status?: string
          first_verified_at?: string | null
          hostname: string
          id?: string
          identity_profile_id: string
          last_checked_at?: string | null
          last_verified_at?: string | null
          monitor_attempts?: number
          monitor_lease_expires_at?: string | null
          monitor_lease_owner?: string | null
          monitoring_fingerprint?: string | null
          next_monitor_at?: string | null
          official?: boolean
          primary_domain?: boolean
          public_visible?: boolean
          revoked_at?: string | null
          updated_at?: string
          verification_confidence?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Update: {
          canonical_url?: string
          created_at?: string
          creator_id?: string
          discovery_checked_at?: string | null
          discovery_lease_expires_at?: string | null
          discovery_lease_owner?: string | null
          discovery_next_check_at?: string | null
          discovery_status?: string
          first_verified_at?: string | null
          hostname?: string
          id?: string
          identity_profile_id?: string
          last_checked_at?: string | null
          last_verified_at?: string | null
          monitor_attempts?: number
          monitor_lease_expires_at?: string | null
          monitor_lease_owner?: string | null
          monitoring_fingerprint?: string | null
          next_monitor_at?: string | null
          official?: boolean
          primary_domain?: boolean
          public_visible?: boolean
          revoked_at?: string | null
          updated_at?: string
          verification_confidence?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_identity_domains_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_domains_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identity_events: {
        Row: {
          account_id: string | null
          actor_user_id: string | null
          created_at: string
          creator_id: string
          domain_id: string | null
          event_type: string
          id: number
          identity_profile_id: string
          metadata: Json
          relationship_id: string | null
          source: string
        }
        Insert: {
          account_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          creator_id: string
          domain_id?: string | null
          event_type: string
          id?: never
          identity_profile_id: string
          metadata?: Json
          relationship_id?: string | null
          source: string
        }
        Update: {
          account_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          creator_id?: string
          domain_id?: string | null
          event_type?: string
          id?: never
          identity_profile_id?: string
          metadata?: Json
          relationship_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_identity_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_events_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_events_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identity_profiles: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          identity_revision: number
          identity_status: string
          primary_domain_id: string | null
          public_display_name: string
          trust_lease_expires_at: string | null
          trust_lease_owner: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          identity_revision?: number
          identity_status?: string
          primary_domain_id?: string | null
          public_display_name: string
          trust_lease_expires_at?: string | null
          trust_lease_owner?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          identity_revision?: number
          identity_status?: string
          primary_domain_id?: string | null
          public_display_name?: string
          trust_lease_expires_at?: string | null
          trust_lease_owner?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_identity_profiles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_primary_domain_fk"
            columns: ["primary_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identity_relationships: {
        Row: {
          confidence: string | null
          created_at: string
          creator_id: string
          evidence_source: string | null
          id: string
          identity_profile_id: string
          relationship_type: string
          revoked_at: string | null
          source_account_id: string | null
          source_domain_id: string | null
          status: string
          target_account_id: string | null
          target_domain_id: string | null
          verified_at: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          creator_id: string
          evidence_source?: string | null
          id?: string
          identity_profile_id: string
          relationship_type: string
          revoked_at?: string | null
          source_account_id?: string | null
          source_domain_id?: string | null
          status?: string
          target_account_id?: string | null
          target_domain_id?: string | null
          verified_at?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          creator_id?: string
          evidence_source?: string | null
          id?: string
          identity_profile_id?: string
          relationship_type?: string
          revoked_at?: string | null
          source_account_id?: string | null
          source_domain_id?: string | null
          status?: string
          target_account_id?: string | null
          target_domain_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_identity_relationships_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_relationships_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_relationships_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_relationships_source_domain_id_fkey"
            columns: ["source_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_relationships_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identity_relationships_target_domain_id_fkey"
            columns: ["target_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_onboarding: {
        Row: {
          backup_step_completed_at: string | null
          completed_at: string | null
          created_at: string
          creator_id: string
          official_step_completed_at: string | null
          recovery_pass_completed_at: string | null
          updated_at: string
        }
        Insert: {
          backup_step_completed_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id: string
          official_step_completed_at?: string | null
          recovery_pass_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          backup_step_completed_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          official_step_completed_at?: string | null
          recovery_pass_completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_onboarding_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_plan_entitlements: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          creator_id: string
          current_period_end: string | null
          plan: string
          source: string
          source_reference: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          creator_id: string
          current_period_end?: string | null
          plan?: string
          source?: string
          source_reference?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          creator_id?: string
          current_period_end?: string | null
          plan?: string
          source?: string
          source_reference?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_plan_entitlements_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_recovery_daily_snapshots: {
        Row: {
          browser_notification_count: number
          created_at: string
          creator_user_id: string
          email_count: number
          id: string
          partially_configured_relationships: number
          recovery_ready_relationships: number
          sms_count: number
          snapshot_date: string
          total_relationships: number
          uncovered_relationships: number
          whatsapp_count: number
        }
        Insert: {
          browser_notification_count: number
          created_at?: string
          creator_user_id: string
          email_count: number
          id?: string
          partially_configured_relationships: number
          recovery_ready_relationships: number
          sms_count: number
          snapshot_date?: string
          total_relationships: number
          uncovered_relationships: number
          whatsapp_count: number
        }
        Update: {
          browser_notification_count?: number
          created_at?: string
          creator_user_id?: string
          email_count?: number
          id?: string
          partially_configured_relationships?: number
          recovery_ready_relationships?: number
          sms_count?: number
          snapshot_date?: string
          total_relationships?: number
          uncovered_relationships?: number
          whatsapp_count?: number
        }
        Relationships: []
      }
      creator_security_alerts: {
        Row: {
          action_url: string | null
          alert_type: string
          created_at: string
          creator_id: string
          dismissed_at: string | null
          id: string
          message: string
          read_at: string | null
          severity: string
          source_incident_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          alert_type: string
          created_at?: string
          creator_id: string
          dismissed_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          severity: string
          source_incident_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          alert_type?: string
          created_at?: string
          creator_id?: string
          dismissed_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          severity?: string
          source_incident_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_security_alerts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_security_alerts_source_incident_id_fkey"
            columns: ["source_incident_id"]
            isOneToOne: false
            referencedRelation: "identity_monitoring_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_team_members: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          permissions: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          permissions?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          permissions?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_team_members_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_trust_evaluations: {
        Row: {
          blocker_count: number
          created_at: string
          creator_id: string
          evaluated_at: string
          expires_at: string | null
          id: string
          identity_profile_id: string
          internal_score: number
          policy_version: string
          source_revision: number
          stale_signal_count: number
          strong_signal_count: number
          trust_state: string
          valid_signal_count: number
          warning_count: number
        }
        Insert: {
          blocker_count: number
          created_at?: string
          creator_id: string
          evaluated_at: string
          expires_at?: string | null
          id?: string
          identity_profile_id: string
          internal_score: number
          policy_version: string
          source_revision: number
          stale_signal_count: number
          strong_signal_count: number
          trust_state: string
          valid_signal_count: number
          warning_count: number
        }
        Update: {
          blocker_count?: number
          created_at?: string
          creator_id?: string
          evaluated_at?: string
          expires_at?: string | null
          id?: string
          identity_profile_id?: string
          internal_score?: number
          policy_version?: string
          source_revision?: number
          stale_signal_count?: number
          strong_signal_count?: number
          trust_state?: string
          valid_signal_count?: number
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_trust_evaluations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_evaluations_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_trust_events: {
        Row: {
          created_at: string
          creator_id: string
          evaluation_id: string | null
          event_type: string
          id: number
          identity_profile_id: string
          metadata: Json
          new_state: string | null
          policy_version: string
          previous_state: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          evaluation_id?: string | null
          event_type: string
          id?: never
          identity_profile_id: string
          metadata?: Json
          new_state?: string | null
          policy_version: string
          previous_state?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          evaluation_id?: string | null
          event_type?: string
          id?: never
          identity_profile_id?: string
          metadata?: Json
          new_state?: string | null
          policy_version?: string
          previous_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_trust_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "creator_trust_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_events_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_trust_recommendations: {
        Row: {
          action_url: string | null
          created_at: string
          creator_id: string
          description: string
          evaluation_id: string
          id: string
          priority: string
          recommendation_code: string
          resolved_at: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          creator_id: string
          description: string
          evaluation_id: string
          id?: string
          priority: string
          recommendation_code: string
          resolved_at?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          evaluation_id?: string
          id?: string
          priority?: string
          recommendation_code?: string
          resolved_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_trust_recommendations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_recommendations_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "creator_trust_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_trust_signals: {
        Row: {
          created_at: string
          creator_id: string
          evaluation_id: string
          expires_at: string | null
          first_observed_at: string | null
          id: string
          identity_account_id: string | null
          identity_domain_id: string | null
          last_observed_at: string | null
          metadata: Json
          provider_family: string
          reason_code: string
          signal_state: string
          signal_type: string
          weight: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          evaluation_id: string
          expires_at?: string | null
          first_observed_at?: string | null
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          last_observed_at?: string | null
          metadata?: Json
          provider_family: string
          reason_code: string
          signal_state: string
          signal_type: string
          weight: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          evaluation_id?: string
          expires_at?: string | null
          first_observed_at?: string | null
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          last_observed_at?: string | null
          metadata?: Json
          provider_family?: string
          reason_code?: string
          signal_state?: string
          signal_type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_trust_signals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_signals_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "creator_trust_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_signals_identity_account_id_fkey"
            columns: ["identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_trust_signals_identity_domain_id_fkey"
            columns: ["identity_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_updates: {
        Row: {
          affected_platform_connection_id: string | null
          ai_enhanced_at: string | null
          ai_prompt_version: string | null
          broadcast_intent: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at: string | null
          content: string
          content_revision: number
          created_at: string
          creator_id: string
          cta_label: string | null
          cta_url: string | null
          deterministic_content: string | null
          deterministic_title: string | null
          id: string
          media_url: string | null
          preview_text: string
          queued_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          source_external_id: string | null
          source_metadata: Json
          source_provider: string | null
          source_published_at: string | null
          status: Database["public"]["Enums"]["broadcast_status"]
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_platform_connection_id?: string | null
          ai_enhanced_at?: string | null
          ai_prompt_version?: string | null
          broadcast_intent: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          content_revision?: number
          created_at?: string
          creator_id: string
          cta_label?: string | null
          cta_url?: string | null
          deterministic_content?: string | null
          deterministic_title?: string | null
          id?: string
          media_url?: string | null
          preview_text?: string
          queued_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          source_external_id?: string | null
          source_metadata?: Json
          source_provider?: string | null
          source_published_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject?: string
          title?: string
          updated_at?: string
        }
        Update: {
          affected_platform_connection_id?: string | null
          ai_enhanced_at?: string | null
          ai_prompt_version?: string | null
          broadcast_intent?: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          content_revision?: number
          created_at?: string
          creator_id?: string
          cta_label?: string | null
          cta_url?: string | null
          deterministic_content?: string | null
          deterministic_title?: string | null
          id?: string
          media_url?: string | null
          preview_text?: string
          queued_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          source_external_id?: string | null
          source_metadata?: Json
          source_provider?: string | null
          source_published_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_updates_affected_platform_connection_id_fkey"
            columns: ["affected_platform_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_updates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          announcement_body: string | null
          announcement_cta_label: string | null
          announcement_cta_url: string | null
          announcement_published_at: string | null
          announcement_title: string | null
          banner_image_path: string | null
          created_at: string
          display_name: string
          id: string
          owner_user_id: string
          profile_image_path: string | null
          public_bio: string | null
          public_profile_enabled: boolean
          public_slug: string | null
          recovery_pass_enabled: boolean
          updated_at: string
        }
        Insert: {
          announcement_body?: string | null
          announcement_cta_label?: string | null
          announcement_cta_url?: string | null
          announcement_published_at?: string | null
          announcement_title?: string | null
          banner_image_path?: string | null
          created_at?: string
          display_name: string
          id?: string
          owner_user_id: string
          profile_image_path?: string | null
          public_bio?: string | null
          public_profile_enabled?: boolean
          public_slug?: string | null
          recovery_pass_enabled?: boolean
          updated_at?: string
        }
        Update: {
          announcement_body?: string | null
          announcement_cta_label?: string | null
          announcement_cta_url?: string | null
          announcement_published_at?: string | null
          announcement_title?: string | null
          banner_image_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          owner_user_id?: string
          profile_image_path?: string | null
          public_bio?: string | null
          public_profile_enabled?: boolean
          public_slug?: string | null
          recovery_pass_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      delivery_health_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
        }
        Relationships: []
      }
      delivery_operator_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["delivery_operator_action_type"]
          actor_role: Database["public"]["Enums"]["delivery_operator_role"]
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string
          target_delivery_id: string | null
          target_provider: string | null
          target_update_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["delivery_operator_action_type"]
          actor_role: Database["public"]["Enums"]["delivery_operator_role"]
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          target_delivery_id?: string | null
          target_provider?: string | null
          target_update_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["delivery_operator_action_type"]
          actor_role?: Database["public"]["Enums"]["delivery_operator_role"]
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          target_delivery_id?: string | null
          target_provider?: string | null
          target_update_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_operator_actions_target_delivery_id_fkey"
            columns: ["target_delivery_id"]
            isOneToOne: false
            referencedRelation: "update_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_operator_actions_target_update_id_fkey"
            columns: ["target_update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_automation_actions: {
        Row: {
          action_type: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          creator_id: string
          destination_id: string
          id: string
          incident_id: string | null
          metadata: Json
          observation_id: string | null
          result_code: string | null
          status: string
        }
        Insert: {
          action_type: string
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          creator_id: string
          destination_id: string
          id?: string
          incident_id?: string | null
          metadata?: Json
          observation_id?: string | null
          result_code?: string | null
          status: string
        }
        Update: {
          action_type?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          creator_id?: string
          destination_id?: string
          id?: string
          incident_id?: string | null
          metadata?: Json
          observation_id?: string | null
          result_code?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_automation_actions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_actions_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_automation_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_actions_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sync_observations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_automation_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          correlation_key: string
          created_at: string
          creator_id: string
          destination_id: string
          id: string
          incident_type: string
          observation_id: string
          resolution_code: string | null
          resolved_at: string | null
          security_alert_id: string | null
          severity: string
          status: string
          summary: string
          title: string
          trust_evaluation_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          correlation_key: string
          created_at?: string
          creator_id: string
          destination_id: string
          id?: string
          incident_type: string
          observation_id: string
          resolution_code?: string | null
          resolved_at?: string | null
          security_alert_id?: string | null
          severity: string
          status?: string
          summary: string
          title: string
          trust_evaluation_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          correlation_key?: string
          created_at?: string
          creator_id?: string
          destination_id?: string
          id?: string
          incident_type?: string
          observation_id?: string
          resolution_code?: string | null
          resolved_at?: string | null
          security_alert_id?: string | null
          severity?: string
          status?: string
          summary?: string
          title?: string
          trust_evaluation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_automation_incidents_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_incidents_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_incidents_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sync_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_incidents_security_alert_id_fkey"
            columns: ["security_alert_id"]
            isOneToOne: false
            referencedRelation: "creator_security_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_automation_incidents_trust_evaluation_id_fkey"
            columns: ["trust_evaluation_id"]
            isOneToOne: false
            referencedRelation: "creator_trust_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          creator_id: string
          destination_id: string | null
          event_type: string
          id: number
          identity_profile_id: string
          metadata: Json
          relationship_id: string | null
          source: string
          verification_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          creator_id: string
          destination_id?: string | null
          event_type: string
          id?: never
          identity_profile_id: string
          metadata?: Json
          relationship_id?: string | null
          source: string
          verification_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          creator_id?: string
          destination_id?: string | null
          event_type?: string
          id?: never
          identity_profile_id?: string
          metadata?: Json
          relationship_id?: string | null
          source?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_events_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_events_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_events_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_events_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_verification_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_sync_observations: {
        Row: {
          authoritative: boolean
          created_at: string
          creator_id: string
          current_fingerprint: string | null
          destination_id: string
          id: string
          normalized_changes: Json
          observation_type: string
          observed_at: string
          previous_fingerprint: string | null
          processed_at: string | null
          provider: string
          severity: string
          source: string
          source_event_id: string | null
          status: string
        }
        Insert: {
          authoritative: boolean
          created_at?: string
          creator_id: string
          current_fingerprint?: string | null
          destination_id: string
          id?: string
          normalized_changes?: Json
          observation_type: string
          observed_at?: string
          previous_fingerprint?: string | null
          processed_at?: string | null
          provider: string
          severity: string
          source: string
          source_event_id?: string | null
          status?: string
        }
        Update: {
          authoritative?: boolean
          created_at?: string
          creator_id?: string
          current_fingerprint?: string | null
          destination_id?: string
          id?: string
          normalized_changes?: Json
          observation_type?: string
          observed_at?: string
          previous_fingerprint?: string | null
          processed_at?: string | null
          provider?: string
          severity?: string
          source?: string
          source_event_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_sync_observations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_sync_observations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_verification_records: {
        Row: {
          confidence: string
          created_at: string
          creator_id: string
          destination_id: string
          evidence_metadata: Json
          expires_at: string | null
          failed_at: string | null
          failure_code: string | null
          id: string
          method: string
          provider: string
          requested_at: string
          requested_by: string
          revoked_at: string | null
          stable_external_id: string | null
          status: string
          updated_at: string
          verification_revision: number
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence: string
          created_at?: string
          creator_id: string
          destination_id: string
          evidence_metadata?: Json
          expires_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          method: string
          provider: string
          requested_at?: string
          requested_by: string
          revoked_at?: string | null
          stable_external_id?: string | null
          status: string
          updated_at?: string
          verification_revision?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          creator_id?: string
          destination_id?: string
          evidence_metadata?: Json
          expires_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          method?: string
          provider?: string
          requested_at?: string
          requested_by?: string
          revoked_at?: string | null
          stable_external_id?: string | null
          status?: string
          updated_at?: string
          verification_revision?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_verification_records_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_verification_records_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_account_verifications: {
        Row: {
          canonical_profile_url: string | null
          challenge_attempts: number
          challenge_consumed_at: string | null
          challenge_expires_at: string | null
          challenge_hash: string | null
          confidence: string
          connected_account_id: string | null
          created_at: string
          creator_id: string
          emergency_id: string | null
          evidence_metadata: Json
          external_account_id: string | null
          external_account_name: string | null
          failed_at: string | null
          failure_code: string | null
          id: string
          last_revalidated_at: string | null
          last_revalidation_error: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          max_challenge_attempts: number
          method: string
          next_revalidation_at: string | null
          provider: string
          replacement_account_id: string
          requested_at: string
          requested_by: string
          revalidation_status: string
          revoked_at: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          canonical_profile_url?: string | null
          challenge_attempts?: number
          challenge_consumed_at?: string | null
          challenge_expires_at?: string | null
          challenge_hash?: string | null
          confidence: string
          connected_account_id?: string | null
          created_at?: string
          creator_id: string
          emergency_id?: string | null
          evidence_metadata?: Json
          external_account_id?: string | null
          external_account_name?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          last_revalidated_at?: string | null
          last_revalidation_error?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_challenge_attempts?: number
          method: string
          next_revalidation_at?: string | null
          provider: string
          replacement_account_id: string
          requested_at?: string
          requested_by: string
          revalidation_status?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          canonical_profile_url?: string | null
          challenge_attempts?: number
          challenge_consumed_at?: string | null
          challenge_expires_at?: string | null
          challenge_hash?: string | null
          confidence?: string
          connected_account_id?: string | null
          created_at?: string
          creator_id?: string
          emergency_id?: string | null
          evidence_metadata?: Json
          external_account_id?: string | null
          external_account_name?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          last_revalidated_at?: string | null
          last_revalidation_error?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_challenge_attempts?: number
          method?: string
          next_revalidation_at?: string | null
          provider?: string
          replacement_account_id?: string
          requested_at?: string
          requested_by?: string
          revalidation_status?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_account_verifications_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_account_verifications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_account_verifications_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_account_verifications_replacement_account_id_fkey"
            columns: ["replacement_account_id"]
            isOneToOne: false
            referencedRelation: "emergency_replacement_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_affected_accounts: {
        Row: {
          canonical_profile_url: string
          connected_account_id: string | null
          created_at: string
          creator_id: string
          display_handle: string
          emergency_id: string
          id: string
          provider: string
          stable_provider_account_id: string
        }
        Insert: {
          canonical_profile_url: string
          connected_account_id?: string | null
          created_at?: string
          creator_id: string
          display_handle: string
          emergency_id: string
          id?: string
          provider: string
          stable_provider_account_id: string
        }
        Update: {
          canonical_profile_url?: string
          connected_account_id?: string | null
          created_at?: string
          creator_id?: string
          display_handle?: string
          emergency_id?: string
          id?: string
          provider?: string
          stable_provider_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_affected_accounts_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_affected_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_affected_accounts_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alert_snapshots: {
        Row: {
          affected_accounts: Json
          approver_ids: string[]
          authorization_assurance_level: string | null
          content_hash: string | null
          created_at: string
          created_by: string
          creator_id: string
          creator_update_id: string
          destination_hash: string | null
          emergency_id: string
          emergency_type: string
          id: string
          message: string
          policy_version: string | null
          replacement_accounts: Json
          revision: number
          severity: string
          stable_provider_account_id: string | null
          title: string
          verification_confidence: string | null
          verification_id: string | null
          verification_method: string | null
        }
        Insert: {
          affected_accounts: Json
          approver_ids?: string[]
          authorization_assurance_level?: string | null
          content_hash?: string | null
          created_at?: string
          created_by: string
          creator_id: string
          creator_update_id: string
          destination_hash?: string | null
          emergency_id: string
          emergency_type: string
          id?: string
          message: string
          policy_version?: string | null
          replacement_accounts: Json
          revision: number
          severity: string
          stable_provider_account_id?: string | null
          title: string
          verification_confidence?: string | null
          verification_id?: string | null
          verification_method?: string | null
        }
        Update: {
          affected_accounts?: Json
          approver_ids?: string[]
          authorization_assurance_level?: string | null
          content_hash?: string | null
          created_at?: string
          created_by?: string
          creator_id?: string
          creator_update_id?: string
          destination_hash?: string | null
          emergency_id?: string
          emergency_type?: string
          id?: string
          message?: string
          policy_version?: string | null
          replacement_accounts?: Json
          revision?: number
          severity?: string
          stable_provider_account_id?: string | null
          title?: string
          verification_confidence?: string | null
          verification_id?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alert_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alert_snapshots_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: true
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alert_snapshots_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alert_snapshots_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "emergency_account_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_approvals: {
        Row: {
          creator_id: string
          decided_at: string
          decided_by: string
          decision: string
          emergency_id: string
          id: string
          invalidated_at: string | null
          policy_version: string | null
          reason: string | null
          revision: number
          snapshot_hash: string | null
          verification_id: string | null
        }
        Insert: {
          creator_id: string
          decided_at?: string
          decided_by: string
          decision: string
          emergency_id: string
          id?: string
          invalidated_at?: string | null
          policy_version?: string | null
          reason?: string | null
          revision: number
          snapshot_hash?: string | null
          verification_id?: string | null
        }
        Update: {
          creator_id?: string
          decided_at?: string
          decided_by?: string
          decision?: string
          emergency_id?: string
          id?: string
          invalidated_at?: string | null
          policy_version?: string | null
          reason?: string | null
          revision?: number
          snapshot_hash?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_approvals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_approvals_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_approvals_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "emergency_account_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_authorization_sessions: {
        Row: {
          assurance_level: string
          consumed_at: string | null
          content_revision: number | null
          created_at: string
          creator_id: string
          emergency_id: string | null
          expires_at: string
          id: string
          issued_at: string
          purpose: string
          revoked_at: string | null
          session_fingerprint_hash: string
          user_id: string
        }
        Insert: {
          assurance_level: string
          consumed_at?: string | null
          content_revision?: number | null
          created_at?: string
          creator_id: string
          emergency_id?: string | null
          expires_at: string
          id?: string
          issued_at?: string
          purpose: string
          revoked_at?: string | null
          session_fingerprint_hash: string
          user_id: string
        }
        Update: {
          assurance_level?: string
          consumed_at?: string | null
          content_revision?: number | null
          created_at?: string
          creator_id?: string
          emergency_id?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          purpose?: string
          revoked_at?: string | null
          session_fingerprint_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_authorization_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_authorization_sessions_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_drills: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_id: string
          drill_mode: string
          id: string
          idempotency_key: string | null
          result: Json
          source_plan_id: string | null
          source_template_id: string | null
          started_at: string
          started_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_id: string
          drill_mode?: string
          id?: string
          idempotency_key?: string | null
          result?: Json
          source_plan_id?: string | null
          source_template_id?: string | null
          started_at?: string
          started_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          drill_mode?: string
          id?: string
          idempotency_key?: string | null
          result?: Json
          source_plan_id?: string | null
          source_template_id?: string | null
          started_at?: string
          started_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_drills_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_drills_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "emergency_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_drills_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "emergency_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          creator_id: string
          emergency_id: string
          event_type: string
          from_status: string | null
          id: number
          metadata: Json
          revision: number
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          creator_id: string
          emergency_id: string
          event_type: string
          from_status?: string | null
          id?: never
          metadata?: Json
          revision: number
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          creator_id?: string
          emergency_id?: string
          event_type?: string
          from_status?: string | null
          id?: never
          metadata?: Json
          revision?: number
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_events_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_plans: {
        Row: {
          affected_account_id: string | null
          created_at: string
          created_by: string
          creator_id: string
          emergency_type: string
          id: string
          last_validated_at: string | null
          message: string
          name: string
          notes: string | null
          proposed_replacement_handle: string | null
          proposed_replacement_provider: string | null
          proposed_replacement_url: string | null
          readiness_result: Json
          readiness_status: string
          severity: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_account_id?: string | null
          created_at?: string
          created_by: string
          creator_id: string
          emergency_type: string
          id?: string
          last_validated_at?: string | null
          message: string
          name: string
          notes?: string | null
          proposed_replacement_handle?: string | null
          proposed_replacement_provider?: string | null
          proposed_replacement_url?: string | null
          readiness_result?: Json
          readiness_status?: string
          severity: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_account_id?: string | null
          created_at?: string
          created_by?: string
          creator_id?: string
          emergency_type?: string
          id?: string
          last_validated_at?: string | null
          message?: string
          name?: string
          notes?: string | null
          proposed_replacement_handle?: string | null
          proposed_replacement_provider?: string | null
          proposed_replacement_url?: string | null
          readiness_result?: Json
          readiness_status?: string
          severity?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_plans_affected_account_id_fkey"
            columns: ["affected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "emergency_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_replacement_accounts: {
        Row: {
          active_verification_id: string | null
          canonical_profile_url: string
          connected_account_id: string | null
          created_at: string
          creator_id: string
          display_handle: string
          emergency_id: string
          id: string
          last_revalidated_at: string | null
          last_revalidation_error: string | null
          next_revalidation_at: string | null
          official: boolean
          provider: string
          revalidation_status: string
          stable_provider_account_id: string
          updated_at: string
          verification_confidence: string | null
          verification_lease_expires_at: string | null
          verification_lease_owner: string | null
          verification_method: string | null
          verification_state: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          active_verification_id?: string | null
          canonical_profile_url: string
          connected_account_id?: string | null
          created_at?: string
          creator_id: string
          display_handle: string
          emergency_id: string
          id?: string
          last_revalidated_at?: string | null
          last_revalidation_error?: string | null
          next_revalidation_at?: string | null
          official?: boolean
          provider: string
          revalidation_status?: string
          stable_provider_account_id: string
          updated_at?: string
          verification_confidence?: string | null
          verification_lease_expires_at?: string | null
          verification_lease_owner?: string | null
          verification_method?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          active_verification_id?: string | null
          canonical_profile_url?: string
          connected_account_id?: string | null
          created_at?: string
          creator_id?: string
          display_handle?: string
          emergency_id?: string
          id?: string
          last_revalidated_at?: string | null
          last_revalidation_error?: string | null
          next_revalidation_at?: string | null
          official?: boolean
          provider?: string
          revalidation_status?: string
          stable_provider_account_id?: string
          updated_at?: string
          verification_confidence?: string | null
          verification_lease_expires_at?: string | null
          verification_lease_owner?: string | null
          verification_method?: string | null
          verification_state?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_replacement_accounts_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_replacement_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_replacement_accounts_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_replacement_active_verification_fk"
            columns: ["active_verification_id"]
            isOneToOne: false
            referencedRelation: "emergency_account_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          creator_id: string
          default_affected_account_id: string | null
          emergency_type: string
          id: string
          message_template: string
          name: string
          severity: string
          title_template: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          creator_id: string
          default_affected_account_id?: string | null
          emergency_type: string
          id?: string
          message_template: string
          name: string
          severity: string
          title_template: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          creator_id?: string
          default_affected_account_id?: string | null
          emergency_type?: string
          id?: string
          message_template?: string
          name?: string
          severity?: string
          title_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_templates_default_affected_account_id_fkey"
            columns: ["default_affected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_category_preferences: {
        Row: {
          category_key: string
          enabled: boolean
          follower_connection_id: string
        }
        Insert: {
          category_key: string
          enabled?: boolean
          follower_connection_id: string
        }
        Update: {
          category_key?: string
          enabled?: boolean
          follower_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_category_preferences_follower_connection_id_fkey"
            columns: ["follower_connection_id"]
            isOneToOne: false
            referencedRelation: "follower_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_connections: {
        Row: {
          activated_at: string | null
          consent_source: string
          consented_at: string
          created_at: string
          creator_id: string
          deactivated_at: string | null
          follower_contact_id: string
          id: string
          landing_path: string | null
          management_tokens_revoked_at: string | null
          preference_token_expires_at: string
          preference_token_hash: string
          selected_recovery_method_id: string | null
          source_campaign: string | null
          source_platform: string
          source_referrer: string | null
          status: string
          unsubscribe_token_expires_at: string
          unsubscribe_token_hash: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          consent_source?: string
          consented_at?: string
          created_at?: string
          creator_id: string
          deactivated_at?: string | null
          follower_contact_id: string
          id?: string
          landing_path?: string | null
          management_tokens_revoked_at?: string | null
          preference_token_expires_at?: string
          preference_token_hash: string
          selected_recovery_method_id?: string | null
          source_campaign?: string | null
          source_platform?: string
          source_referrer?: string | null
          status?: string
          unsubscribe_token_expires_at?: string
          unsubscribe_token_hash: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          consent_source?: string
          consented_at?: string
          created_at?: string
          creator_id?: string
          deactivated_at?: string | null
          follower_contact_id?: string
          id?: string
          landing_path?: string | null
          management_tokens_revoked_at?: string | null
          preference_token_expires_at?: string
          preference_token_hash?: string
          selected_recovery_method_id?: string | null
          source_campaign?: string | null
          source_platform?: string
          source_referrer?: string | null
          status?: string
          unsubscribe_token_expires_at?: string
          unsubscribe_token_hash?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_connections_follower_contact_id_fkey"
            columns: ["follower_contact_id"]
            isOneToOne: false
            referencedRelation: "follower_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_connections_selected_recovery_method_id_fkey"
            columns: ["selected_recovery_method_id"]
            isOneToOne: false
            referencedRelation: "follower_recovery_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_contacts: {
        Row: {
          created_at: string
          email_ciphertext: string | null
          email_hash: string | null
          email_masked: string | null
          id: string
          phone_ciphertext: string | null
          phone_hash: string | null
          phone_masked: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_ciphertext?: string | null
          email_hash?: string | null
          email_masked?: string | null
          id?: string
          phone_ciphertext?: string | null
          phone_hash?: string | null
          phone_masked?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_ciphertext?: string | null
          email_hash?: string | null
          email_masked?: string | null
          id?: string
          phone_ciphertext?: string | null
          phone_hash?: string | null
          phone_masked?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      follower_notification_preferences: {
        Row: {
          creator_announcements: boolean
          follower_connection_id: string
          important_account_updates: boolean
          new_content: boolean
          updated_at: string
        }
        Insert: {
          creator_announcements?: boolean
          follower_connection_id: string
          important_account_updates?: boolean
          new_content?: boolean
          updated_at?: string
        }
        Update: {
          creator_announcements?: boolean
          follower_connection_id?: string
          important_account_updates?: boolean
          new_content?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_notification_preferences_follower_connection_id_fkey"
            columns: ["follower_connection_id"]
            isOneToOne: true
            referencedRelation: "follower_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_recovery_destination_preferences: {
        Row: {
          connected_account_id: string | null
          creator_id: string
          ecosystem_destination_id: string | null
          follower_connection_id: string
          id: string
          identity_account_id: string | null
          opted_out_at: string | null
          selected_at: string
          status: string
          updated_at: string
        }
        Insert: {
          connected_account_id?: string | null
          creator_id: string
          ecosystem_destination_id?: string | null
          follower_connection_id: string
          id?: string
          identity_account_id?: string | null
          opted_out_at?: string | null
          selected_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          connected_account_id?: string | null
          creator_id?: string
          ecosystem_destination_id?: string | null
          follower_connection_id?: string
          id?: string
          identity_account_id?: string | null
          opted_out_at?: string | null
          selected_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_recovery_destination_pre_ecosystem_destination_id_fkey"
            columns: ["ecosystem_destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_recovery_destination_prefe_follower_connection_id_fkey"
            columns: ["follower_connection_id"]
            isOneToOne: false
            referencedRelation: "follower_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_recovery_destination_prefere_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_recovery_destination_preferen_identity_account_id_fkey"
            columns: ["identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_recovery_destination_preferences_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_recovery_methods: {
        Row: {
          consent_purpose: string | null
          consent_revoked_at: string | null
          consent_source: string | null
          consent_version: string | null
          consented_at: string
          created_at: string
          destination_hash: string | null
          destination_masked: string | null
          failure_code: string | null
          follower_contact_id: string
          id: string
          last_failure_at: string | null
          method_status: string
          method_type: string
          opt_out_reason: string | null
          opted_out_at: string | null
          provider_identifier: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          consent_purpose?: string | null
          consent_revoked_at?: string | null
          consent_source?: string | null
          consent_version?: string | null
          consented_at?: string
          created_at?: string
          destination_hash?: string | null
          destination_masked?: string | null
          failure_code?: string | null
          follower_contact_id: string
          id?: string
          last_failure_at?: string | null
          method_status?: string
          method_type: string
          opt_out_reason?: string | null
          opted_out_at?: string | null
          provider_identifier?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          consent_purpose?: string | null
          consent_revoked_at?: string | null
          consent_source?: string | null
          consent_version?: string | null
          consented_at?: string
          created_at?: string
          destination_hash?: string | null
          destination_masked?: string | null
          failure_code?: string | null
          follower_contact_id?: string
          id?: string
          last_failure_at?: string | null
          method_status?: string
          method_type?: string
          opt_out_reason?: string | null
          opted_out_at?: string | null
          provider_identifier?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follower_recovery_methods_follower_contact_id_fkey"
            columns: ["follower_contact_id"]
            isOneToOne: false
            referencedRelation: "follower_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_monitoring_actions: {
        Row: {
          action_type: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          creator_id: string
          id: string
          metadata: Json
          monitoring_incident_id: string
          result_code: string | null
          status: string
        }
        Insert: {
          action_type: string
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          creator_id: string
          id?: string
          metadata?: Json
          monitoring_incident_id: string
          result_code?: string | null
          status: string
        }
        Update: {
          action_type?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          metadata?: Json
          monitoring_incident_id?: string
          result_code?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_monitoring_actions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_actions_monitoring_incident_id_fkey"
            columns: ["monitoring_incident_id"]
            isOneToOne: false
            referencedRelation: "identity_monitoring_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_monitoring_incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_account_id: string | null
          affected_domain_id: string | null
          assigned_to: string | null
          correlation_key: string
          created_at: string
          creator_id: string
          emergency_id: string | null
          id: string
          identity_profile_id: string
          incident_type: string
          observation_id: string
          resolution_code: string | null
          resolved_at: string | null
          severity: string
          status: string
          summary: string
          title: string
          trust_evaluation_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_account_id?: string | null
          affected_domain_id?: string | null
          assigned_to?: string | null
          correlation_key: string
          created_at?: string
          creator_id: string
          emergency_id?: string | null
          id?: string
          identity_profile_id: string
          incident_type: string
          observation_id: string
          resolution_code?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          summary: string
          title: string
          trust_evaluation_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_account_id?: string | null
          affected_domain_id?: string | null
          assigned_to?: string | null
          correlation_key?: string
          created_at?: string
          creator_id?: string
          emergency_id?: string | null
          id?: string
          identity_profile_id?: string
          incident_type?: string
          observation_id?: string
          resolution_code?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string
          title?: string
          trust_evaluation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_monitoring_incidents_affected_account_id_fkey"
            columns: ["affected_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_affected_domain_id_fkey"
            columns: ["affected_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "creator_emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "identity_monitoring_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_incidents_trust_evaluation_id_fkey"
            columns: ["trust_evaluation_id"]
            isOneToOne: false
            referencedRelation: "creator_trust_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_monitoring_observations: {
        Row: {
          created_at: string
          creator_id: string
          current_fingerprint: string | null
          expires_at: string | null
          id: string
          identity_account_id: string | null
          identity_domain_id: string | null
          identity_profile_id: string
          metadata: Json
          observation_status: string
          observation_type: string
          observed_at: string
          previous_fingerprint: string | null
          processed_at: string | null
          provider: string | null
          severity: string
          source: string
          source_event_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          identity_profile_id: string
          metadata?: Json
          observation_status?: string
          observation_type: string
          observed_at: string
          previous_fingerprint?: string | null
          processed_at?: string | null
          provider?: string | null
          severity: string
          source: string
          source_event_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          identity_account_id?: string | null
          identity_domain_id?: string | null
          identity_profile_id?: string
          metadata?: Json
          observation_status?: string
          observation_type?: string
          observed_at?: string
          previous_fingerprint?: string | null
          processed_at?: string | null
          provider?: string | null
          severity?: string
          source?: string
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_monitoring_observations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_observations_identity_account_id_fkey"
            columns: ["identity_account_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_observations_identity_domain_id_fkey"
            columns: ["identity_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_monitoring_observations_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_social_content: {
        Row: {
          approved_at: string | null
          created_at: string
          creator_update_id: string | null
          detection_event_id: string
          id: string
          imported_metadata: Json
          platform_connection_id: string
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          creator_update_id?: string | null
          detection_event_id: string
          id?: string
          imported_metadata?: Json
          platform_connection_id: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          creator_update_id?: string | null
          detection_event_id?: string
          id?: string
          imported_metadata?: Json
          platform_connection_id?: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_social_content_creator_update_id_fkey"
            columns: ["creator_update_id"]
            isOneToOne: true
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_social_content_detection_event_id_fkey"
            columns: ["detection_event_id"]
            isOneToOne: true
            referencedRelation: "social_detection_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_social_content_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_service_challenges: {
        Row: {
          attempt_count: number
          created_at: string
          creator_id: string
          exact_url: string
          expires_at: string
          id: string
          manual_service_id: string
          max_attempts: number
          method: string
          status: string
          token_hash: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          creator_id: string
          exact_url: string
          expires_at: string
          id?: string
          manual_service_id: string
          max_attempts?: number
          method: string
          status?: string
          token_hash: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          creator_id?: string
          exact_url?: string
          expires_at?: string
          id?: string
          manual_service_id?: string
          max_attempts?: number
          method?: string
          status?: string
          token_hash?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_service_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_service_challenges_manual_service_id_fkey"
            columns: ["manual_service_id"]
            isOneToOne: false
            referencedRelation: "manual_service_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_service_connections: {
        Row: {
          archived_at: string | null
          canonical_url: string
          created_at: string
          creator_id: string
          current_challenge_id: string | null
          display_name: string
          id: string
          identity_profile_id: string
          last_verified_at: string | null
          metadata: Json
          normalized_hostname: string
          official: boolean
          primary_for_category: boolean
          public_handle: string | null
          public_visible: boolean
          revoked_at: string | null
          service_category: string
          service_name: string
          source_domain_id: string | null
          updated_at: string
          verification_confidence: string | null
          verification_expires_at: string | null
          verification_method: string | null
          verification_status: string
        }
        Insert: {
          archived_at?: string | null
          canonical_url: string
          created_at?: string
          creator_id: string
          current_challenge_id?: string | null
          display_name: string
          id?: string
          identity_profile_id: string
          last_verified_at?: string | null
          metadata?: Json
          normalized_hostname: string
          official?: boolean
          primary_for_category?: boolean
          public_handle?: string | null
          public_visible?: boolean
          revoked_at?: string | null
          service_category: string
          service_name: string
          source_domain_id?: string | null
          updated_at?: string
          verification_confidence?: string | null
          verification_expires_at?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string
          created_at?: string
          creator_id?: string
          current_challenge_id?: string | null
          display_name?: string
          id?: string
          identity_profile_id?: string
          last_verified_at?: string | null
          metadata?: Json
          normalized_hostname?: string
          official?: boolean
          primary_for_category?: boolean
          public_handle?: string | null
          public_visible?: boolean
          revoked_at?: string | null
          service_category?: string
          service_name?: string
          source_domain_id?: string | null
          updated_at?: string
          verification_confidence?: string | null
          verification_expires_at?: string | null
          verification_method?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_service_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_service_connections_identity_profile_id_fkey"
            columns: ["identity_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_service_connections_source_domain_id_fkey"
            columns: ["source_domain_id"]
            isOneToOne: false
            referencedRelation: "creator_identity_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_service_current_challenge_fkey"
            columns: ["current_challenge_id"]
            isOneToOne: false
            referencedRelation: "manual_service_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_webhook_subscriptions: {
        Row: {
          asset_binding_id: string
          created_at: string
          creator_id: string
          id: string
          last_event_at: string | null
          last_reconciled_at: string | null
          next_reconcile_at: string | null
          object_type: string
          status: string
          subscribed_fields: string[]
          updated_at: string
        }
        Insert: {
          asset_binding_id: string
          created_at?: string
          creator_id: string
          id?: string
          last_event_at?: string | null
          last_reconciled_at?: string | null
          next_reconcile_at?: string | null
          object_type: string
          status?: string
          subscribed_fields?: string[]
          updated_at?: string
        }
        Update: {
          asset_binding_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          last_event_at?: string | null
          last_reconciled_at?: string | null
          next_reconcile_at?: string | null
          object_type?: string
          status?: string
          subscribed_fields?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_webhook_subscriptions_asset_binding_id_fkey"
            columns: ["asset_binding_id"]
            isOneToOne: false
            referencedRelation: "provider_asset_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connection_secrets: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          platform_connection_id: string
          refresh_token_ciphertext: string | null
          token_scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          platform_connection_id: string
          refresh_token_ciphertext?: string | null
          token_scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          platform_connection_id?: string
          refresh_token_ciphertext?: string | null
          token_scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connection_secrets_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: true
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_feed_ownership_challenges: {
        Row: {
          attempt_count: number
          created_at: string
          creator_id: string
          ecosystem_destination_id: string
          expires_at: string
          id: string
          placement_method: string
          status: string
          token_hash: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          creator_id: string
          ecosystem_destination_id: string
          expires_at: string
          id?: string
          placement_method: string
          status?: string
          token_hash: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          creator_id?: string
          ecosystem_destination_id?: string
          expires_at?: string
          id?: string
          placement_method?: string
          status?: string
          token_hash?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_feed_ownership_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_feed_ownership_challenges_ecosystem_destination_id_fkey"
            columns: ["ecosystem_destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_access_reviews: {
        Row: {
          access_level: string | null
          capability: string
          created_at: string
          expires_at: string | null
          id: string
          notes_code: string | null
          provider: string
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          capability: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes_code?: string | null
          provider: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          capability?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes_code?: string | null
          provider?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_asset_bindings: {
        Row: {
          approval_required: boolean
          asset_type: string
          authority_status: string
          canonical_url: string
          connected_account_id: string
          created_at: string
          creator_id: string
          detection_enabled: boolean
          display_handle: string | null
          display_name: string
          id: string
          last_successful_sync_at: string | null
          metadata: Json
          next_sync_at: string | null
          parent_asset_id: string | null
          provider: string
          public_visible: boolean
          revoked_at: string | null
          stable_asset_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          approval_required?: boolean
          asset_type: string
          authority_status?: string
          canonical_url: string
          connected_account_id: string
          created_at?: string
          creator_id: string
          detection_enabled?: boolean
          display_handle?: string | null
          display_name: string
          id?: string
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          parent_asset_id?: string | null
          provider: string
          public_visible?: boolean
          revoked_at?: string | null
          stable_asset_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          approval_required?: boolean
          asset_type?: string
          authority_status?: string
          canonical_url?: string
          connected_account_id?: string
          created_at?: string
          creator_id?: string
          detection_enabled?: boolean
          display_handle?: string | null
          display_name?: string
          id?: string
          last_successful_sync_at?: string | null
          metadata?: Json
          next_sync_at?: string | null
          parent_asset_id?: string | null
          provider?: string
          public_visible?: boolean
          revoked_at?: string | null
          stable_asset_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_asset_bindings_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_asset_bindings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_asset_secrets: {
        Row: {
          asset_binding_id: string
          created_at: string
          creator_id: string
          credential_ciphertext: string
          credential_type: string
          expires_at: string | null
          granted_permissions: string[]
          provider: string
          updated_at: string
        }
        Insert: {
          asset_binding_id: string
          created_at?: string
          creator_id: string
          credential_ciphertext: string
          credential_type: string
          expires_at?: string | null
          granted_permissions?: string[]
          provider: string
          updated_at?: string
        }
        Update: {
          asset_binding_id?: string
          created_at?: string
          creator_id?: string
          credential_ciphertext?: string
          credential_type?: string
          expires_at?: string | null
          granted_permissions?: string[]
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_asset_secrets_asset_binding_id_fkey"
            columns: ["asset_binding_id"]
            isOneToOne: true
            referencedRelation: "provider_asset_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_asset_secrets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_audience_metric_snapshots: {
        Row: {
          approximate: boolean
          audience_count: number
          audience_unit: string
          created_at: string
          creator_id: string
          id: string
          metric_id: string
          observed_on: string
          provider: string
          source_observed_at: string | null
        }
        Insert: {
          approximate?: boolean
          audience_count: number
          audience_unit: string
          created_at?: string
          creator_id: string
          id?: string
          metric_id: string
          observed_on: string
          provider: string
          source_observed_at?: string | null
        }
        Update: {
          approximate?: boolean
          audience_count?: number
          audience_unit?: string
          created_at?: string
          creator_id?: string
          id?: string
          metric_id?: string
          observed_on?: string
          provider?: string
          source_observed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_audience_metric_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_audience_metric_snapshots_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "provider_audience_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_audience_metrics: {
        Row: {
          account_category: string
          approximate: boolean
          asset_binding_id: string | null
          audience_count: number | null
          audience_unit: string | null
          connection_id: string | null
          consecutive_failures: number
          created_at: string
          creator_id: string
          error_code: string | null
          id: string
          last_success_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          provider: string
          source_observed_at: string | null
          status: string
          synchronized_at: string
          updated_at: string
        }
        Insert: {
          account_category: string
          approximate?: boolean
          asset_binding_id?: string | null
          audience_count?: number | null
          audience_unit?: string | null
          connection_id?: string | null
          consecutive_failures?: number
          created_at?: string
          creator_id: string
          error_code?: string | null
          id?: string
          last_success_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_sync_at?: string | null
          provider: string
          source_observed_at?: string | null
          status: string
          synchronized_at?: string
          updated_at?: string
        }
        Update: {
          account_category?: string
          approximate?: boolean
          asset_binding_id?: string | null
          audience_count?: number | null
          audience_unit?: string | null
          connection_id?: string | null
          consecutive_failures?: number
          created_at?: string
          creator_id?: string
          error_code?: string | null
          id?: string
          last_success_at?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_sync_at?: string | null
          provider?: string
          source_observed_at?: string | null
          status?: string
          synchronized_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_audience_metrics_asset_binding_id_fkey"
            columns: ["asset_binding_id"]
            isOneToOne: false
            referencedRelation: "provider_asset_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_audience_metrics_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_audience_metrics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_content_sources: {
        Row: {
          approval_required: boolean
          authority_state: string
          canonical_url: string | null
          configuration: Json
          connected_account_id: string | null
          consecutive_failures: number
          created_at: string
          creator_id: string
          detection_enabled: boolean
          display_name: string | null
          ecosystem_destination_id: string | null
          id: string
          last_cursor: string | null
          last_detected_at: string | null
          last_failure_class: string | null
          last_successful_sync_at: string | null
          next_sync_at: string | null
          provider: string
          source_type: string
          stable_source_id: string
          sync_lease_expires_at: string | null
          sync_lease_owner: string | null
          updated_at: string
          verification_state: string
        }
        Insert: {
          approval_required?: boolean
          authority_state?: string
          canonical_url?: string | null
          configuration?: Json
          connected_account_id?: string | null
          consecutive_failures?: number
          created_at?: string
          creator_id: string
          detection_enabled?: boolean
          display_name?: string | null
          ecosystem_destination_id?: string | null
          id?: string
          last_cursor?: string | null
          last_detected_at?: string | null
          last_failure_class?: string | null
          last_successful_sync_at?: string | null
          next_sync_at?: string | null
          provider: string
          source_type: string
          stable_source_id: string
          sync_lease_expires_at?: string | null
          sync_lease_owner?: string | null
          updated_at?: string
          verification_state?: string
        }
        Update: {
          approval_required?: boolean
          authority_state?: string
          canonical_url?: string | null
          configuration?: Json
          connected_account_id?: string | null
          consecutive_failures?: number
          created_at?: string
          creator_id?: string
          detection_enabled?: boolean
          display_name?: string | null
          ecosystem_destination_id?: string | null
          id?: string
          last_cursor?: string | null
          last_detected_at?: string | null
          last_failure_class?: string | null
          last_successful_sync_at?: string | null
          next_sync_at?: string | null
          provider?: string
          source_type?: string
          stable_source_id?: string
          sync_lease_expires_at?: string | null
          sync_lease_owner?: string | null
          updated_at?: string
          verification_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_content_sources_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_content_sources_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_content_sources_ecosystem_destination_id_fkey"
            columns: ["ecosystem_destination_id"]
            isOneToOne: false
            referencedRelation: "creator_ecosystem_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_product_entitlements: {
        Row: {
          access_tier: string | null
          capability: string
          created_at: string
          effective_at: string | null
          expires_at: string | null
          id: string
          notes_code: string | null
          product: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          access_tier?: string | null
          capability: string
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          notes_code?: string | null
          product: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_tier?: string | null
          capability?: string
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          notes_code?: string | null
          product?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_stream_checkpoints: {
        Row: {
          checkpoint: string | null
          consecutive_failures: number
          created_at: string
          id: string
          last_event_at: string | null
          last_heartbeat_at: string | null
          next_reconnect_at: string | null
          provider: string
          status: string
          stream_type: string
          updated_at: string
        }
        Insert: {
          checkpoint?: string | null
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_event_at?: string | null
          last_heartbeat_at?: string | null
          next_reconnect_at?: string | null
          provider?: string
          status?: string
          stream_type: string
          updated_at?: string
        }
        Update: {
          checkpoint?: string | null
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_event_at?: string | null
          last_heartbeat_at?: string | null
          next_reconnect_at?: string | null
          provider?: string
          status?: string
          stream_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_verification_challenges: {
        Row: {
          asset_binding_id: string | null
          attempt_count: number
          canonical_url: string
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          max_attempts: number
          placement_method: string
          provider: string
          status: string
          token_hash: string
          verified_at: string | null
        }
        Insert: {
          asset_binding_id?: string | null
          attempt_count?: number
          canonical_url: string
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          max_attempts?: number
          placement_method: string
          provider: string
          status?: string
          token_hash: string
          verified_at?: string | null
        }
        Update: {
          asset_binding_id?: string | null
          attempt_count?: number
          canonical_url?: string
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          placement_method?: string
          provider?: string
          status?: string
          token_hash?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_verification_challenges_asset_binding_id_fkey"
            columns: ["asset_binding_id"]
            isOneToOne: false
            referencedRelation: "provider_asset_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verification_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_entitlement_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          id: string
          plan: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment: string
          id?: string
          plan: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          plan?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_verification_sessions: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          landing_path: string | null
          preferences: Json
          provider_verification_id: string | null
          recovery_method_id: string
          replaced_at: string | null
          resend_available_at: string
          resend_count: number
          session_token_hash: string
          source_ip_hash: string | null
          source_platform: string
          source_referrer: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          landing_path?: string | null
          preferences: Json
          provider_verification_id?: string | null
          recovery_method_id: string
          replaced_at?: string | null
          resend_available_at: string
          resend_count?: number
          session_token_hash: string
          source_ip_hash?: string | null
          source_platform: string
          source_referrer?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          landing_path?: string | null
          preferences?: Json
          provider_verification_id?: string | null
          recovery_method_id?: string
          replaced_at?: string | null
          resend_available_at?: string
          resend_count?: number
          session_token_hash?: string
          source_ip_hash?: string | null
          source_platform?: string
          source_referrer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_verification_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_verification_sessions_recovery_method_id_fkey"
            columns: ["recovery_method_id"]
            isOneToOne: false
            referencedRelation: "follower_recovery_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      social_detection_events: {
        Row: {
          created_at: string
          creator_id: string
          detected_at: string
          detection_source: string
          event_type: string
          external_event_id: string | null
          external_object_id: string
          id: string
          object_type: string
          platform_connection_id: string
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_received_at: string | null
          source_payload: Json
          source_published_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          detected_at?: string
          detection_source?: string
          event_type: string
          external_event_id?: string | null
          external_object_id: string
          id?: string
          object_type: string
          platform_connection_id: string
          processing_error?: string | null
          processing_status?: string
          provider: string
          provider_event_received_at?: string | null
          source_payload?: Json
          source_published_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          detected_at?: string
          detection_source?: string
          event_type?: string
          external_event_id?: string | null
          external_object_id?: string
          id?: string
          object_type?: string
          platform_connection_id?: string
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_received_at?: string | null
          source_payload?: Json
          source_published_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_detection_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_detection_events_platform_connection_id_fkey"
            columns: ["platform_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_webhook_receipts: {
        Row: {
          created_at: string
          event_timestamp: string
          id: string
          payload_digest: string
          processing_status: string
          provider: string
          provider_event_id: string
          signature_verified: boolean
        }
        Insert: {
          created_at?: string
          event_timestamp: string
          id?: string
          payload_digest: string
          processing_status?: string
          provider: string
          provider_event_id: string
          signature_verified: boolean
        }
        Update: {
          created_at?: string
          event_timestamp?: string
          id?: string
          payload_digest?: string
          processing_status?: string
          provider?: string
          provider_event_id?: string
          signature_verified?: boolean
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_created: number
          event_type: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          event_created: number
          event_type: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          event_created?: number
          event_type?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      twitch_eventsub_subscriptions: {
        Row: {
          connected_account_id: string
          created_at: string
          creator_id: string
          id: string
          last_event_at: string | null
          last_reconciled_at: string | null
          next_reconcile_at: string | null
          provider_subscription_id: string
          status: string
          subscription_type: string
          subscription_version: string
          updated_at: string
        }
        Insert: {
          connected_account_id: string
          created_at?: string
          creator_id: string
          id?: string
          last_event_at?: string | null
          last_reconciled_at?: string | null
          next_reconcile_at?: string | null
          provider_subscription_id: string
          status: string
          subscription_type: string
          subscription_version: string
          updated_at?: string
        }
        Update: {
          connected_account_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          last_event_at?: string | null
          last_reconciled_at?: string | null
          next_reconcile_at?: string | null
          provider_subscription_id?: string
          status?: string
          subscription_type?: string
          subscription_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitch_eventsub_subscriptions_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitch_eventsub_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      update_deliveries: {
        Row: {
          accepted_at: string | null
          attempt_count: number
          bounced_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          complained_at: string | null
          connection_id: string
          contact_id: string
          created_at: string
          creator_id: string
          delivered_at: string | null
          destination: string
          destination_hash: string | null
          failed_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          preference_category: string
          provider: string | null
          provider_error_code: string | null
          provider_error_message: string | null
          provider_message_id: string | null
          provider_metadata: Json
          provider_status: string | null
          queued_at: string
          recovery_method_id: string
          sending_at: string | null
          skipped_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          attempt_count?: number
          bounced_at?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          complained_at?: string | null
          connection_id: string
          contact_id: string
          created_at?: string
          creator_id: string
          delivered_at?: string | null
          destination: string
          destination_hash?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          preference_category: string
          provider?: string | null
          provider_error_code?: string | null
          provider_error_message?: string | null
          provider_message_id?: string | null
          provider_metadata?: Json
          provider_status?: string | null
          queued_at?: string
          recovery_method_id: string
          sending_at?: string | null
          skipped_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          attempt_count?: number
          bounced_at?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          complained_at?: string | null
          connection_id?: string
          contact_id?: string
          created_at?: string
          creator_id?: string
          delivered_at?: string | null
          destination?: string
          destination_hash?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          preference_category?: string
          provider?: string | null
          provider_error_code?: string | null
          provider_error_message?: string | null
          provider_message_id?: string | null
          provider_metadata?: Json
          provider_status?: string | null
          queued_at?: string
          recovery_method_id?: string
          sending_at?: string | null
          skipped_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          transport?: Database["public"]["Enums"]["delivery_transport"]
          update_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_deliveries_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "follower_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_deliveries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "follower_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_deliveries_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_deliveries_recovery_method_id_fkey"
            columns: ["recovery_method_id"]
            isOneToOne: false
            referencedRelation: "follower_recovery_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_deliveries_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "creator_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_delivery_events: {
        Row: {
          created_at: string
          event_timestamp: string | null
          event_type: string
          id: string
          normalized_status:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          payload: Json
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          provider_message_id: string | null
          received_at: string
          signature_verified: boolean
          update_delivery_id: string | null
        }
        Insert: {
          created_at?: string
          event_timestamp?: string | null
          event_type: string
          id?: string
          normalized_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          payload?: Json
          processing_error?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          provider_message_id?: string | null
          received_at?: string
          signature_verified: boolean
          update_delivery_id?: string | null
        }
        Update: {
          created_at?: string
          event_timestamp?: string | null
          event_type?: string
          id?: string
          normalized_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          payload?: Json
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          provider_message_id?: string | null
          received_at?: string
          signature_verified?: boolean
          update_delivery_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "update_delivery_events_update_delivery_id_fkey"
            columns: ["update_delivery_id"]
            isOneToOne: false
            referencedRelation: "update_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_verification_sessions: {
        Row: {
          attempt_count: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          landing_path: string | null
          preferences: Json
          provider_verification_id: string | null
          provider_verified_at: string | null
          recovery_method_id: string
          replaced_at: string | null
          resend_available_at: string
          resend_count: number
          session_token_hash: string
          source_ip_hash: string | null
          source_platform: string
          source_referrer: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          landing_path?: string | null
          preferences: Json
          provider_verification_id?: string | null
          provider_verified_at?: string | null
          recovery_method_id: string
          replaced_at?: string | null
          resend_available_at: string
          resend_count?: number
          session_token_hash: string
          source_ip_hash?: string | null
          source_platform: string
          source_referrer?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          landing_path?: string | null
          preferences?: Json
          provider_verification_id?: string | null
          provider_verified_at?: string | null
          recovery_method_id?: string
          replaced_at?: string | null
          resend_available_at?: string
          resend_count?: number
          session_token_hash?: string
          source_ip_hash?: string | null
          source_platform?: string
          source_referrer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_verification_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_verification_sessions_recovery_method_id_fkey"
            columns: ["recovery_method_id"]
            isOneToOne: false
            referencedRelation: "follower_recovery_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_oauth_pending_selections: {
        Row: {
          access_token_ciphertext: string
          consumed_at: string | null
          created_at: string
          creator_id: string
          eligible_channels: Json
          expires_at: string
          granted_scopes: string[]
          id: string
          protected_official_account_id: string | null
          reconnect_connection_id: string | null
          refresh_token_ciphertext: string | null
          requested_role: string
          token_expires_at: string
          token_type: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          consumed_at?: string | null
          created_at?: string
          creator_id: string
          eligible_channels: Json
          expires_at: string
          granted_scopes: string[]
          id: string
          protected_official_account_id?: string | null
          reconnect_connection_id?: string | null
          refresh_token_ciphertext?: string | null
          requested_role: string
          token_expires_at: string
          token_type: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          consumed_at?: string | null
          created_at?: string
          creator_id?: string
          eligible_channels?: Json
          expires_at?: string
          granted_scopes?: string[]
          id?: string
          protected_official_account_id?: string | null
          reconnect_connection_id?: string | null
          refresh_token_ciphertext?: string | null
          requested_role?: string
          token_expires_at?: string
          token_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_oauth_pending_selecti_protected_official_account_i_fkey"
            columns: ["protected_official_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_oauth_pending_selections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_oauth_pending_selections_reconnect_connection_id_fkey"
            columns: ["reconnect_connection_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_connected_accounts: {
        Row: {
          is_primary: boolean | null
          label: string | null
          platform: string | null
          position: number | null
          public_slug: string | null
          url: string | null
        }
        Relationships: []
      }
      public_creator_profiles: {
        Row: {
          announcement_body: string | null
          announcement_cta_label: string | null
          announcement_cta_url: string | null
          announcement_published_at: string | null
          announcement_title: string | null
          banner_image_path: string | null
          created_at: string | null
          display_name: string | null
          profile_image_path: string | null
          public_bio: string | null
          public_slug: string | null
          recovery_pass_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          announcement_body?: string | null
          announcement_cta_label?: string | null
          announcement_cta_url?: string | null
          announcement_published_at?: string | null
          announcement_title?: string | null
          banner_image_path?: string | null
          created_at?: string | null
          display_name?: string | null
          profile_image_path?: string | null
          public_bio?: string | null
          public_slug?: string | null
          recovery_pass_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          announcement_body?: string | null
          announcement_cta_label?: string | null
          announcement_cta_url?: string | null
          announcement_published_at?: string | null
          announcement_title?: string | null
          banner_image_path?: string | null
          created_at?: string | null
          display_name?: string | null
          profile_image_path?: string | null
          public_bio?: string | null
          public_slug?: string | null
          recovery_pass_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_emergency:
        | { Args: { p_emergency_id: string }; Returns: Json }
        | {
            Args: {
              p_authorization_session_id?: string
              p_emergency_id: string
            }
            Returns: Json
          }
      activate_sms_recovery_pass: {
        Args: {
          p_preference_token_hash: string
          p_session_id: string
          p_token_expires_at: string
          p_unsubscribe_token_hash: string
        }
        Returns: string
      }
      add_emergency_replacement: {
        Args: {
          p_account_id: string
          p_emergency_id: string
          p_handle: string
          p_provider: string
          p_url: string
        }
        Returns: string
      }
      append_ecosystem_event: {
        Args: {
          p_destination_id: string
          p_event_type: string
          p_metadata?: Json
          p_source: string
        }
        Returns: number
      }
      append_identity_event: {
        Args: {
          p_account_id?: string
          p_domain_id?: string
          p_event_type: string
          p_metadata?: Json
          p_profile_id: string
          p_relationship_id?: string
          p_source: string
        }
        Returns: undefined
      }
      append_provider_audience_snapshot: {
        Args: { p_metric_id: string }
        Returns: boolean
      }
      apply_emergency_revalidation: {
        Args: {
          p_error?: string
          p_external_id: string
          p_name: string
          p_outcome: string
          p_url: string
          p_verification_id: string
        }
        Returns: Json
      }
      apply_identity_provider_sync: {
        Args: {
          p_account_id: string
          p_error?: string
          p_handle: string
          p_name: string
          p_stable_id: string
          p_status: string
          p_url: string
        }
        Returns: Json
      }
      apply_stripe_subscription_event: {
        Args: {
          p_cancel_at: string
          p_cancel_at_period_end: boolean
          p_creator_id: string
          p_customer_id: string
          p_event_created: number
          p_event_id: string
          p_event_type: string
          p_interval: string
          p_period_end: string
          p_period_start: string
          p_price_id: string
          p_status: string
          p_subscription_id: string
          p_trial_end: string
        }
        Returns: boolean
      }
      apply_update_delivery_event: {
        Args: {
          p_event_timestamp: string
          p_event_type: string
          p_normalized_status: string
          p_payload: Json
          p_provider: string
          p_provider_event_id: string
          p_provider_message_id: string
          p_signature_verified: boolean
        }
        Returns: Json
      }
      approve_emergency: {
        Args: { p_emergency_id: string; p_reason?: string }
        Returns: Json
      }
      archive_ecosystem_destination: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      archive_identity_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      archive_manual_service: { Args: { p_id: string }; Returns: undefined }
      broadcast_audience_rule_for_target: {
        Args: {
          affected_platform_connection_id: string
          intent: Database["public"]["Enums"]["broadcast_intent"]
        }
        Returns: string
      }
      broadcast_type_for_intent: {
        Args: { intent: Database["public"]["Enums"]["broadcast_intent"] }
        Returns: Database["public"]["Enums"]["broadcast_type"]
      }
      cancel_ai_draft_enhancement: {
        Args: { p_update_id: string }
        Returns: Json
      }
      cancel_scheduled_update: {
        Args: { p_creator_id: string; p_update_id: string }
        Returns: Json
      }
      capture_creator_recovery_daily_snapshot: {
        Args: { p_creator_user_id: string }
        Returns: string
      }
      capture_recovery_daily_snapshots: {
        Args: { p_limit?: number }
        Returns: number
      }
      check_recovery_pass_name_availability: {
        Args: { p_slug: string }
        Returns: string
      }
      claim_ai_draft_enhancement_jobs: {
        Args: {
          p_lease_owner?: string
          p_lease_seconds?: number
          p_limit?: number
        }
        Returns: {
          attempt_count: number
          auto_send_requested: boolean
          base_content_revision: number
          completed_at: string | null
          created_at: string
          creator_id: string
          creator_update_id: string
          failed_at: string | null
          id: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          preferred_variant: string
          prompt_version: string
          requested_variants: string[]
          result_applied: boolean
          source_event_type: string | null
          source_object_type: string | null
          source_provider: string | null
          stale_result: boolean
          started_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_draft_enhancement_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_authenticity_domain_discovery: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          canonical_url: string
          created_at: string
          creator_id: string
          discovery_checked_at: string | null
          discovery_lease_expires_at: string | null
          discovery_lease_owner: string | null
          discovery_next_check_at: string | null
          discovery_status: string
          first_verified_at: string | null
          hostname: string
          id: string
          identity_profile_id: string
          last_checked_at: string | null
          last_verified_at: string | null
          monitor_attempts: number
          monitor_lease_expires_at: string | null
          monitor_lease_owner: string | null
          monitoring_fingerprint: string | null
          next_monitor_at: string | null
          official: boolean
          primary_domain: boolean
          public_visible: boolean
          revoked_at: string | null
          updated_at: string
          verification_confidence: string | null
          verification_method: string | null
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_identity_domains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_authenticity_issuance: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          created_at: string
          creator_id: string
          display_enabled: boolean
          embed_enabled: boolean
          id: string
          identity_profile_id: string
          issuance_lease_expires_at: string | null
          issuance_lease_owner: string | null
          presentation_revision: number
          public_slug: string
          public_summary: string | null
          public_title: string | null
          qr_enabled: boolean
          show_relationship_history: boolean
          show_verified_timestamps: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_authenticity_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_authenticity_network_deliveries: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_id: string
          event_type: string
          failed_at: string | null
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string | null
          payload: Json
          payload_hash: string
          response_status: number | null
          status: string
          subscription_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "authenticity_network_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_ecosystem_automation_destinations: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          archived_at: string | null
          auto_apply_safe_changes: boolean
          automation_enabled: boolean
          automation_pause_reason: string | null
          automation_paused_at: string | null
          canonical_url: string
          capabilities: Json
          consecutive_failures: number
          created_at: string
          creator_id: string
          current_fingerprint: string | null
          destination_type: string
          display_handle: string | null
          display_name: string
          first_verified_at: string | null
          hostname: string
          id: string
          identity_profile_id: string
          last_attempted_sync_at: string | null
          last_authoritative_event_at: string | null
          last_failure_class: string | null
          last_failure_code: string | null
          last_observed_fingerprint: string | null
          last_revalidated_at: string | null
          last_successful_sync_at: string | null
          last_sync_error_code: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          next_revalidation_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_type: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_identity_account_id: string | null
          stable_external_id: string | null
          sync_attempts: number
          sync_lease_expires_at: string | null
          sync_lease_owner: string | null
          sync_priority: string
          sync_revision: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_expires_at: string | null
          verification_method: string | null
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_ecosystem_destinations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_ecosystem_sync: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          archived_at: string | null
          auto_apply_safe_changes: boolean
          automation_enabled: boolean
          automation_pause_reason: string | null
          automation_paused_at: string | null
          canonical_url: string
          capabilities: Json
          consecutive_failures: number
          created_at: string
          creator_id: string
          current_fingerprint: string | null
          destination_type: string
          display_handle: string | null
          display_name: string
          first_verified_at: string | null
          hostname: string
          id: string
          identity_profile_id: string
          last_attempted_sync_at: string | null
          last_authoritative_event_at: string | null
          last_failure_class: string | null
          last_failure_code: string | null
          last_observed_fingerprint: string | null
          last_revalidated_at: string | null
          last_successful_sync_at: string | null
          last_sync_error_code: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          next_revalidation_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_type: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_identity_account_id: string | null
          stable_external_id: string | null
          sync_attempts: number
          sync_lease_expires_at: string | null
          sync_lease_owner: string | null
          sync_priority: string
          sync_revision: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_expires_at: string | null
          verification_method: string | null
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_ecosystem_destinations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_emergency_verifications: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          canonical_profile_url: string | null
          challenge_attempts: number
          challenge_consumed_at: string | null
          challenge_expires_at: string | null
          challenge_hash: string | null
          confidence: string
          connected_account_id: string | null
          created_at: string
          creator_id: string
          emergency_id: string | null
          evidence_metadata: Json
          external_account_id: string | null
          external_account_name: string | null
          failed_at: string | null
          failure_code: string | null
          id: string
          last_revalidated_at: string | null
          last_revalidation_error: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          max_challenge_attempts: number
          method: string
          next_revalidation_at: string | null
          provider: string
          replacement_account_id: string
          requested_at: string
          requested_by: string
          revalidation_status: string
          revoked_at: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "emergency_account_verifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_expansion_four_connections: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "connected_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_expansion_three_connections: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "connected_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_expansion_two_connections: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "connected_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_identity_accounts: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_kind: string
          archived_at: string | null
          canonical_profile_url: string
          created_at: string
          creator_id: string
          display_handle: string | null
          display_name: string | null
          first_verified_at: string | null
          id: string
          identity_profile_id: string
          last_revalidated_at: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          monitor_attempts: number
          monitor_lease_expires_at: string | null
          monitor_lease_owner: string | null
          monitoring_fingerprint: string | null
          next_monitor_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_provider: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_replacement_account_id: string | null
          stable_provider_account_id: string
          sync_attempts: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_method: string | null
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_identity_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_identity_monitoring: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_kind: string
          archived_at: string | null
          canonical_profile_url: string
          created_at: string
          creator_id: string
          display_handle: string | null
          display_name: string | null
          first_verified_at: string | null
          id: string
          identity_profile_id: string
          last_revalidated_at: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          last_verified_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          metadata: Json
          monitor_attempts: number
          monitor_lease_expires_at: string | null
          monitor_lease_owner: string | null
          monitoring_fingerprint: string | null
          next_monitor_at: string | null
          next_sync_at: string | null
          official: boolean
          primary_for_provider: boolean
          provider: string
          public_visible: boolean
          revoked_at: string | null
          source_connection_id: string | null
          source_replacement_account_id: string | null
          stable_provider_account_id: string
          sync_attempts: number
          sync_status: string
          updated_at: string
          verification_confidence: string | null
          verification_method: string | null
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_identity_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_provider_audience_metrics: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          account_category: string
          approximate: boolean
          asset_binding_id: string | null
          audience_count: number | null
          audience_unit: string | null
          connection_id: string | null
          consecutive_failures: number
          created_at: string
          creator_id: string
          error_code: string | null
          id: string
          last_success_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          provider: string
          source_observed_at: string | null
          status: string
          synchronized_at: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "provider_audience_metrics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_provider_content_sources: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          approval_required: boolean
          authority_state: string
          canonical_url: string | null
          configuration: Json
          connected_account_id: string | null
          consecutive_failures: number
          created_at: string
          creator_id: string
          detection_enabled: boolean
          display_name: string | null
          ecosystem_destination_id: string | null
          id: string
          last_cursor: string | null
          last_detected_at: string | null
          last_failure_class: string | null
          last_successful_sync_at: string | null
          next_sync_at: string | null
          provider: string
          source_type: string
          stable_source_id: string
          sync_lease_expires_at: string | null
          sync_lease_owner: string | null
          updated_at: string
          verification_state: string
        }[]
        SetofOptions: {
          from: "*"
          to: "provider_content_sources"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_social_connections: {
        Args: {
          p_lease_owner?: string
          p_lease_seconds?: number
          p_limit?: number
        }
        Returns: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "connected_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_trust_evaluations: {
        Args: { p_lease_owner?: string; p_limit?: number }
        Returns: {
          created_at: string
          creator_id: string
          id: string
          identity_revision: number
          identity_status: string
          primary_domain_id: string | null
          public_display_name: string
          trust_lease_expires_at: string | null
          trust_lease_owner: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_identity_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_update_deliveries: {
        Args: {
          p_limit: number
          p_max_attempts: number
          p_stuck_timeout_seconds: number
        }
        Returns: {
          attempt_count: number
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          content: string
          creator_display_name: string
          creator_id: string
          creator_public_slug: string
          cta_label: string
          cta_url: string
          delivery_id: string
          destination: string
          preview_text: string
          subject: string
          title: string
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
        }[]
      }
      claim_youtube_connections: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          account_type: string
          auto_create_drafts: boolean
          auto_send: boolean
          capability_state: Json
          connection_health: string
          created_at: string
          creator_id: string
          external_account_id: string | null
          external_account_name: string | null
          external_account_url: string | null
          granted_scopes: string[]
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          last_connection_error: string | null
          last_external_cursor: string | null
          last_sync_at: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          next_sync_at: string | null
          platform: string
          poll_claimed_until: string | null
          position: number
          protected_official_account_id: string | null
          provider_metadata: Json
          provider_status: string
          requested_scopes: string[]
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string
          url: string
          watch_enabled: boolean
          webhook_enabled: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "connected_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_emergency: {
        Args: { p_action: string; p_emergency_id: string }
        Returns: Json
      }
      complete_ai_draft_enhancement: {
        Args: {
          p_estimated_cost: number
          p_input_tokens: number
          p_job_id: string
          p_lease_owner: string
          p_model: string
          p_output_tokens: number
          p_provider: string
          p_variants: Json
        }
        Returns: Json
      }
      complete_podcast_feed_challenge: {
        Args: {
          p_challenge_id: string
          p_max_attempts?: number
          p_token_hash: string
        }
        Returns: boolean
      }
      complete_whatsapp_recovery_verification: {
        Args: {
          p_destination_hash: string
          p_preference_token_hash: string
          p_recovery_method_id: string
          p_session_id: string
          p_token_expires_at: string
          p_unsubscribe_token_hash: string
        }
        Returns: string
      }
      consume_emergency_authorization: {
        Args: {
          p_emergency_id: string
          p_purpose: string
          p_revision: number
          p_session_id: string
        }
        Returns: string
      }
      create_emergency: {
        Args: {
          p_affected_account: string
          p_message: string
          p_severity: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_manual_service: {
        Args: {
          p_canonical_url: string
          p_category: string
          p_display_name: string
          p_hostname: string
          p_public_handle: string
          p_service_name: string
        }
        Returns: string
      }
      create_prepared_emergency: {
        Args: {
          p_affected_account?: string
          p_creation_key?: string
          p_plan_id?: string
          p_template_id?: string
        }
        Returns: string
      }
      create_recovery_pass: {
        Args: { p_display_name: string; p_slug: string }
        Returns: string
      }
      create_social_draft: { Args: { p_event_id: string }; Returns: Json }
      create_update_delivery_queue: {
        Args: { p_creator_id: string; p_recipients: Json; p_update_id: string }
        Returns: Json
      }
      create_youtube_draft: { Args: { p_event_id: string }; Returns: Json }
      delivery_provider_for_transport: {
        Args: { p_transport: Database["public"]["Enums"]["delivery_transport"] }
        Returns: string
      }
      ecosystem_trust_provider_family: {
        Args: { p_provider: string }
        Returns: string
      }
      emergency_append_event: {
        Args: {
          p_emergency_id: string
          p_event_type: string
          p_from: string
          p_metadata?: Json
          p_to: string
        }
        Returns: undefined
      }
      emergency_snapshot_hash: {
        Args: { p_emergency_id: string }
        Returns: string
      }
      enqueue_ai_draft_enhancement: {
        Args: {
          p_auto_send_requested?: boolean
          p_prompt_version: string
          p_requested_variants?: string[]
          p_update_id: string
        }
        Returns: Json
      }
      ensure_creator_authenticity_profile: { Args: never; Returns: string }
      ensure_creator_identity_profile: { Args: never; Returns: string }
      ensure_ecosystem_destination: {
        Args: {
          p_canonical_url: string
          p_destination_type: string
          p_display_handle: string
          p_display_name: string
          p_hostname: string
          p_metadata?: Json
          p_provider: string
          p_source_connection_id?: string
          p_source_identity_account_id?: string
          p_stable_external_id: string
        }
        Returns: string
      }
      evaluate_creator_trust: {
        Args: {
          p_domain_freshness_hours?: number
          p_emergency_freshness_hours?: number
          p_policy_version?: string
          p_profile_id: string
          p_provider_freshness_hours?: number
          p_ttl_minutes?: number
        }
        Returns: string
      }
      expected_delivery_transport: {
        Args: {
          selected_method_type: string
          update_type: Database["public"]["Enums"]["broadcast_type"]
        }
        Returns: Database["public"]["Enums"]["delivery_transport"]
      }
      expected_update_preference: {
        Args: { update_type: Database["public"]["Enums"]["broadcast_type"] }
        Returns: string
      }
      fail_ai_draft_enhancement: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_job_id: string
          p_lease_owner: string
          p_retryable: boolean
        }
        Returns: Json
      }
      get_ai_usage_summary: { Args: never; Returns: Json }
      get_creator_ecosystem_graph: { Args: never; Returns: Json }
      get_creator_identity_graph: { Args: never; Returns: Json }
      get_creator_platform_audience_metrics: {
        Args: never
        Returns: {
          account_category: string
          approximate: boolean
          audience_count: number
          audience_unit: string
          growth_percent: number
          next_sync_at: string
          provider: string
          source_observed_at: string
          status: string
          synchronized_at: string
          trend: number[]
        }[]
      }
      get_creator_protected_fan_count: { Args: never; Returns: number }
      get_creator_recent_recovery_opt_ins: {
        Args: { p_limit?: number }
        Returns: {
          destination_count: number
          preference_id: string
          provider: string
          selected_at: string
        }[]
      }
      get_creator_recovery_audience_summary: {
        Args: { p_creator_id: string; p_range?: string }
        Returns: Json
      }
      get_creator_recovery_broadcast_performance: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          acceptance_rate: number
          accepted: number
          affected_platform: string
          audience_snapshot_size: number
          broadcast_intent: Database["public"]["Enums"]["broadcast_intent"]
          cancelled: number
          confirmed_delivery_rate: number
          data_completeness_state: string
          delivered: number
          failed: number
          failure_rate: number
          latest_delivery_activity: string
          permanent_failed: number
          provider_breakdown: Json
          published_at: string
          queued: number
          retryable_failed: number
          sending: number
          skipped: number
          title: string
          transport_breakdown: Json
          update_id: string
        }[]
      }
      get_creator_recovery_coverage: {
        Args: never
        Returns: {
          change_vs_previous_snapshot: number
          last_snapshot_at: string
          partially_configured_relationships: number
          recovery_coverage_rate: number
          recovery_ready_relationships: number
          total_relationships: number
          uncovered_relationships: number
        }[]
      }
      get_creator_recovery_coverage_trend: {
        Args: { p_days?: number }
        Returns: {
          history_source: string
          recovery_coverage_rate: number
          recovery_ready_relationships: number
          snapshot_date: string
          total_relationships: number
        }[]
      }
      get_creator_recovery_destination_breakdown: {
        Args: never
        Returns: {
          coverage_percent: number
          destination_id: string
          display_handle: string
          display_name: string
          href: string
          opted_in_fan_count: number
          provider: string
          role: string
          synchronized_at: string
          verification_state: string
        }[]
      }
      get_creator_recovery_funnel: {
        Args: never
        Returns: {
          drop_from_previous_stage: number
          percentage_of_total: number
          relationship_count: number
          stage: string
        }[]
      }
      get_creator_recovery_transport_breakdown: {
        Args: never
        Returns: {
          percentage_of_recovery_ready: number
          percentage_of_total_audience: number
          relationship_count: number
          transport: Database["public"]["Enums"]["delivery_transport"]
        }[]
      }
      get_creator_recovery_update_performance: {
        Args: { p_update_id: string }
        Returns: Json
      }
      get_creator_trust: { Args: never; Returns: Json }
      get_delivery_provider_health: {
        Args: { p_window_minutes?: number }
        Returns: {
          acceptance_rate: number
          accepted: number
          delivered: number
          delivery_rate: number
          failed: number
          last_activity: string
          permanent_failures: number
          provider: string
          queued: number
          retryable: number
          sending: number
          transport: Database["public"]["Enums"]["delivery_transport"]
        }[]
      }
      get_delivery_system_health: { Args: never; Returns: Json }
      get_live_recovery_analytics: {
        Args: { p_emergency_id: string }
        Returns: Json
      }
      get_pending_provider_events: {
        Args: { p_limit?: number }
        Returns: {
          age_seconds: number
          event_type: string
          id: string
          processing_status: string
          provider: string
          provider_message_id_present: boolean
          received_at: string
        }[]
      }
      get_provider_connection_entitlement: {
        Args: { p_creator_id: string; p_role: string }
        Returns: Json
      }
      get_public_creator_authenticity: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_public_creator_ecosystem_graph: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_public_creator_identity_graph: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_public_creator_page: { Args: { p_slug: string }; Returns: Json }
      get_public_creator_trust: { Args: { p_slug: string }; Returns: Json }
      get_social_automation_analytics: {
        Args: { p_provider?: string }
        Returns: Json
      }
      get_stuck_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          age_seconds: number
          attempt_count: number
          failure_code: string
          id: string
          provider: string
          provider_message_id_present: boolean
          sending_at: string
          status: Database["public"]["Enums"]["delivery_status"]
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
        }[]
      }
      get_youtube_automation_analytics: { Args: never; Returns: Json }
      has_creator_permission: {
        Args: { p_creator_id: string; p_permission: string }
        Returns: boolean
      }
      import_ecosystem_destination: {
        Args: {
          p_canonical_url: string
          p_destination_type: string
          p_display_name: string
          p_hostname: string
          p_provider: string
        }
        Returns: string
      }
      ingest_ecosystem_observation: {
        Args: {
          p_authoritative: boolean
          p_current_fingerprint: string
          p_destination_id: string
          p_normalized_changes: Json
          p_observation_type: string
          p_observed_at?: string
          p_previous_fingerprint: string
          p_severity: string
          p_source: string
          p_source_event_id: string
        }
        Returns: string
      }
      ingest_identity_observation: {
        Args: {
          p_account_id?: string
          p_current_fingerprint?: string
          p_domain_id?: string
          p_metadata?: Json
          p_observation_type: string
          p_observed_at?: string
          p_previous_fingerprint?: string
          p_profile_id: string
          p_severity: string
          p_source: string
          p_source_event_id?: string
        }
        Returns: Json
      }
      ingest_social_detection: {
        Args: {
          p_connection_id: string
          p_detection_source?: string
          p_event_type: string
          p_external_event_id: string
          p_external_object_id: string
          p_object_type: string
          p_provider: string
          p_source_payload: Json
          p_source_published_at: string
        }
        Returns: Json
      }
      ingest_youtube_detection: {
        Args: {
          p_connection_id: string
          p_event_type: string
          p_external_object_id: string
          p_object_type: string
          p_source_payload: Json
          p_source_published_at: string
        }
        Returns: Json
      }
      invalidate_emergency_verification_approval: {
        Args: { p_emergency_id: string; p_reason: string }
        Returns: undefined
      }
      is_app_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_local_qa_database: { Args: never; Returns: boolean }
      is_published_creator_media: {
        Args: { object_name: string }
        Returns: boolean
      }
      is_recovery_method_usable: {
        Args: { p_contact_id: string; p_method_id: string }
        Returns: boolean
      }
      mark_provider_source_sync: {
        Args: {
          p_cursor?: string
          p_failure_class?: string
          p_next_sync_at?: string
          p_source_id: string
          p_success: boolean
        }
        Returns: undefined
      }
      mark_social_connection_healthy: {
        Args: {
          p_connection_id: string
          p_cursor: string
          p_next_sync_at: string
        }
        Returns: undefined
      }
      mark_social_connection_unhealthy: {
        Args: {
          p_connection_id: string
          p_error: string
          p_health: string
          p_next_sync_at: string
        }
        Returns: undefined
      }
      mark_trust_recommendation_resolved: {
        Args: { p_recommendation_id: string }
        Returns: undefined
      }
      mark_update_delivery_accepted: {
        Args: {
          p_delivery_id: string
          p_provider: string
          p_provider_message_id: string
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      mark_update_delivery_failed: {
        Args: {
          p_code: string
          p_delivery_id: string
          p_max_attempts: number
          p_provider: string
          p_reason: string
          p_retryable: boolean
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      opt_out_sms_recovery_method: {
        Args: { p_destination_hash: string; p_reason: string }
        Returns: number
      }
      opt_out_whatsapp_recovery_method: {
        Args: { p_destination_hash: string; p_reason: string }
        Returns: number
      }
      pause_ecosystem_automation: {
        Args: { p_destination_id: string; p_reason?: string }
        Returns: undefined
      }
      prepare_monitoring_emergency: {
        Args: { p_incident_id: string }
        Returns: string
      }
      process_ecosystem_observation: {
        Args: {
          p_alert_required: boolean
          p_classification: string
          p_incident_required: boolean
          p_needs_attention: boolean
          p_observation_id: string
          p_policy_version: string
          p_retry_at?: string
          p_retry_required: boolean
          p_revoke: boolean
          p_safe_auto_apply: boolean
          p_suppress: boolean
        }
        Returns: Json
      }
      process_identity_observation: {
        Args: { p_observation_id: string }
        Returns: string
      }
      process_update_delivery_event: {
        Args: { p_event_id: string }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      provision_configured_app_admin: {
        Args: { p_display_email: string; p_user_id: string }
        Returns: undefined
      }
      publish_update_delivery_queue: {
        Args: {
          p_creator_id: string
          p_recipients: Json
          p_scheduled_for?: string
          p_update_id: string
        }
        Returns: Json
      }
      queue_ecosystem_resync: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      queue_identity_account_sync: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      reconcile_pending_provider_event: {
        Args: {
          p_actor_role?: Database["public"]["Enums"]["delivery_operator_role"]
          p_actor_user_id: string
          p_pending_event_id: string
          p_reason: string
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      reconcile_pending_provider_events: {
        Args: { p_limit?: number }
        Returns: number
      }
      reconcile_provider_account_hierarchy: {
        Args: { p_creator_id: string; p_platform: string }
        Returns: string
      }
      reconcile_update_delivery_events: {
        Args: { p_provider: string; p_provider_message_id: string }
        Returns: number
      }
      record_authenticity_view: {
        Args: { p_kind: string; p_slug: string }
        Returns: undefined
      }
      record_emergency_verification: {
        Args: {
          p_canonical_url: string
          p_confidence: string
          p_connected_account_id?: string
          p_evidence?: Json
          p_external_id: string
          p_external_name: string
          p_method: string
          p_replacement_id: string
        }
        Returns: string
      }
      release_stuck_delivery: {
        Args: {
          p_actor_role?: Database["public"]["Enums"]["delivery_operator_role"]
          p_actor_user_id: string
          p_delivery_id: string
          p_reason: string
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      request_authenticity_assertion_refresh: {
        Args: never
        Returns: undefined
      }
      resume_ecosystem_automation: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      retry_failed_delivery: {
        Args: {
          p_actor_role?: Database["public"]["Enums"]["delivery_operator_role"]
          p_actor_user_id: string
          p_delivery_id: string
          p_reason: string
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
      }
      revoke_ecosystem_destination: {
        Args: { p_destination_id: string; p_reason?: string }
        Returns: undefined
      }
      revoke_emergency_verification: {
        Args: { p_emergency_id: string; p_replacement_id: string }
        Returns: undefined
      }
      select_ai_draft_variant: {
        Args: { p_update_id: string; p_variant_id: string }
        Returns: Json
      }
      select_provider_asset: {
        Args: {
          p_asset_type: string
          p_canonical_url: string
          p_connected_account_id: string
          p_display_handle: string
          p_display_name: string
          p_metadata?: Json
          p_parent_asset_id: string
          p_provider: string
          p_stable_asset_id: string
        }
        Returns: string
      }
      set_ecosystem_destination_presentation: {
        Args: {
          p_destination_id: string
          p_official: boolean
          p_public_visible: boolean
        }
        Returns: undefined
      }
      set_identity_account_presentation: {
        Args: {
          p_account_id: string
          p_official: boolean
          p_primary: boolean
          p_public_visible: boolean
        }
        Returns: Json
      }
      set_primary_ecosystem_destination: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      set_primary_identity_domain: {
        Args: { p_domain_id: string; p_public_visible?: boolean }
        Returns: undefined
      }
      start_podcast_feed_challenge: {
        Args: {
          p_destination_id: string
          p_placement_method: string
          p_token_hash: string
          p_ttl_minutes?: number
        }
        Returns: string
      }
      store_authenticity_assertion: {
        Args: {
          p_expires_at: string
          p_identity_revision: number
          p_issued_at: string
          p_key_id: string
          p_payload: Json
          p_payload_hash: string
          p_presentation_revision: number
          p_profile_id: string
          p_signature: string
          p_trust_policy_version: string
          p_trust_state: string
        }
        Returns: string
      }
      store_authenticity_manifest: {
        Args: {
          p_expires_at?: string
          p_identity_revision: number
          p_payload: Json
          p_payload_hash: string
          p_presentation_revision: number
          p_profile_id: string
        }
        Returns: string
      }
      store_continuity_statement: {
        Args: {
          p_current_account_id: string
          p_current_url: string
          p_expires_at?: string
          p_issued_at: string
          p_key_id: string
          p_payload: Json
          p_payload_hash: string
          p_previous_account_id: string
          p_previous_url: string
          p_profile_id: string
          p_provider: string
          p_reason_code: string
          p_signature: string
          p_source_revision: number
          p_statement_type: string
        }
        Returns: string
      }
      store_provider_content_source: {
        Args: {
          p_canonical_url: string
          p_configuration?: Json
          p_connected_account_id?: string
          p_destination_id?: string
          p_display_name: string
          p_provider: string
          p_source_type: string
          p_stable_source_id: string
        }
        Returns: string
      }
      submit_emergency: { Args: { p_emergency_id: string }; Returns: Json }
      sync_identity_account_from_connection: {
        Args: { p_connection_id: string }
        Returns: string
      }
      sync_identity_account_from_emergency_replacement: {
        Args: { p_replacement_id: string }
        Returns: string
      }
      sync_identity_domain: {
        Args: { p_verification_id: string }
        Returns: string
      }
      trust_provider_family: { Args: { p_provider: string }; Returns: string }
      update_creator_authenticity_profile: {
        Args: {
          p_display_enabled: boolean
          p_embed_enabled: boolean
          p_public_summary?: string
          p_public_title?: string
          p_qr_enabled: boolean
          p_show_relationship_history: boolean
          p_show_verified_timestamps: boolean
        }
        Returns: undefined
      }
      update_ecosystem_automation_incident: {
        Args: {
          p_action: string
          p_incident_id: string
          p_resolution_code?: string
        }
        Returns: undefined
      }
      update_emergency: {
        Args: {
          p_emergency_id: string
          p_message: string
          p_severity: string
          p_title: string
          p_type: string
        }
        Returns: Json
      }
      update_manual_service_presentation: {
        Args: { p_id: string; p_public_visible: boolean }
        Returns: undefined
      }
      update_monitoring_incident: {
        Args: {
          p_action: string
          p_incident_id: string
          p_resolution_code?: string
        }
        Returns: undefined
      }
      update_security_alert: {
        Args: { p_action: string; p_alert_id: string }
        Returns: undefined
      }
      upsert_provider_audience_metric: {
        Args: {
          p_account_category: string
          p_approximate: boolean
          p_asset_binding_id: string
          p_connection_id: string
          p_count: number
          p_creator_id: string
          p_error_code?: string
          p_next_sync_at: string
          p_provider: string
          p_source_observed_at: string
          p_status: string
          p_unit: string
        }
        Returns: string
      }
      verify_ecosystem_destination: {
        Args: {
          p_confidence: string
          p_destination_id: string
          p_expires_at?: string
          p_method: string
          p_stable_external_id?: string
        }
        Returns: string
      }
      verify_emergency_replacement: {
        Args: {
          p_account_id: string
          p_emergency_id: string
          p_handle: string
          p_method: string
          p_official?: boolean
          p_provider: string
          p_url: string
        }
        Returns: string
      }
      verify_manual_service: {
        Args: {
          p_challenge_id: string
          p_confidence: string
          p_id: string
          p_method: string
        }
        Returns: undefined
      }
    }
    Enums: {
      broadcast_intent:
        | "account_hacked"
        | "account_banned"
        | "account_inaccessible"
        | "impersonation_warning"
        | "platform_migration"
        | "new_video"
        | "livestream"
        | "podcast_episode"
        | "product_release"
        | "event"
        | "general_announcement"
        | "community_update"
      broadcast_status:
        | "draft"
        | "scheduled"
        | "queued"
        | "sending"
        | "sent"
        | "cancelled"
        | "failed"
      broadcast_type:
        | "new_content"
        | "announcement"
        | "livestream"
        | "event"
        | "product_launch"
        | "account_update"
      delivery_operator_action_type:
        | "retry_delivery"
        | "release_stuck_delivery"
        | "reconcile_provider_event"
        | "cancel_delivery"
        | "mark_incident"
        | "resolve_incident"
      delivery_operator_role: "delivery_operator" | "delivery_admin"
      delivery_status:
        | "queued"
        | "sending"
        | "accepted"
        | "delivered"
        | "bounced"
        | "complained"
        | "failed"
        | "skipped"
        | "cancelled"
      delivery_transport: "email" | "sms" | "whatsapp" | "browser_notification"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      broadcast_intent: [
        "account_hacked",
        "account_banned",
        "account_inaccessible",
        "impersonation_warning",
        "platform_migration",
        "new_video",
        "livestream",
        "podcast_episode",
        "product_release",
        "event",
        "general_announcement",
        "community_update",
      ],
      broadcast_status: [
        "draft",
        "scheduled",
        "queued",
        "sending",
        "sent",
        "cancelled",
        "failed",
      ],
      broadcast_type: [
        "new_content",
        "announcement",
        "livestream",
        "event",
        "product_launch",
        "account_update",
      ],
      delivery_operator_action_type: [
        "retry_delivery",
        "release_stuck_delivery",
        "reconcile_provider_event",
        "cancel_delivery",
        "mark_incident",
        "resolve_incident",
      ],
      delivery_operator_role: ["delivery_operator", "delivery_admin"],
      delivery_status: [
        "queued",
        "sending",
        "accepted",
        "delivered",
        "bounced",
        "complained",
        "failed",
        "skipped",
        "cancelled",
      ],
      delivery_transport: ["email", "sms", "whatsapp", "browser_notification"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
