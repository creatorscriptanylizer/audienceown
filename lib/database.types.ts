export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      creator_updates: {
        Row: {
          affected_platform_connection_id: string | null
          broadcast_intent: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at: string | null
          content: string
          created_at: string
          creator_id: string
          cta_label: string | null
          cta_url: string | null
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
          broadcast_intent: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          created_at?: string
          creator_id: string
          cta_label?: string | null
          cta_url?: string | null
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
          broadcast_intent?: Database["public"]["Enums"]["broadcast_intent"]
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          created_at?: string
          creator_id?: string
          cta_label?: string | null
          cta_url?: string | null
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
          public_slug: string
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
          public_slug: string
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
          public_slug?: string
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
      activate_sms_recovery_pass: {
        Args: {
          p_preference_token_hash: string
          p_session_id: string
          p_token_expires_at: string
          p_unsubscribe_token_hash: string
        }
        Returns: string
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
      is_published_creator_media: {
        Args: { object_name: string }
        Returns: boolean
      }
      is_recovery_method_usable: {
        Args: { p_contact_id: string; p_method_id: string }
        Returns: boolean
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
      process_update_delivery_event: {
        Args: { p_event_id: string }
        Returns: Database["public"]["Enums"]["delivery_status"]
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
      reconcile_update_delivery_events: {
        Args: { p_provider: string; p_provider_message_id: string }
        Returns: number
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
      retry_failed_delivery: {
        Args: {
          p_actor_role?: Database["public"]["Enums"]["delivery_operator_role"]
          p_actor_user_id: string
          p_delivery_id: string
          p_reason: string
        }
        Returns: Database["public"]["Enums"]["delivery_status"]
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
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
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

