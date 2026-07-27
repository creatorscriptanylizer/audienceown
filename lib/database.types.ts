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
      connected_accounts: {
        Row: {
          account_type: string
          created_at: string
          creator_id: string
          id: string
          is_primary: boolean
          is_public: boolean
          label: string
          platform: string
          position: number
          updated_at: string
          url: string
        }
        Insert: {
          account_type: string
          created_at?: string
          creator_id: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          label: string
          platform: string
          position?: number
          updated_at?: string
          url: string
        }
        Update: {
          account_type?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          label?: string
          platform?: string
          position?: number
          updated_at?: string
          url?: string
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
      creator_updates: {
        Row: {
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at: string | null
          content: string
          created_at: string
          creator_id: string
          cta_label: string | null
          cta_url: string | null
          id: string
          preview_text: string
          queued_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["broadcast_status"]
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          created_at?: string
          creator_id: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          preview_text?: string
          queued_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject?: string
          title?: string
          updated_at?: string
        }
        Update: {
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          cancelled_at?: string | null
          content?: string
          created_at?: string
          creator_id?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          preview_text?: string
          queued_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
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
          consented_at: string
          created_at: string
          destination_hash: string | null
          destination_masked: string | null
          follower_contact_id: string
          id: string
          method_status: string
          method_type: string
          provider_identifier: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          consented_at?: string
          created_at?: string
          destination_hash?: string | null
          destination_masked?: string | null
          follower_contact_id: string
          id?: string
          method_status?: string
          method_type: string
          provider_identifier?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          consented_at?: string
          created_at?: string
          destination_hash?: string | null
          destination_masked?: string | null
          follower_contact_id?: string
          id?: string
          method_status?: string
          method_type?: string
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
      update_deliveries: {
        Row: {
          attempt_count: number
          cancelled_at: string | null
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
          provider_message_id: string | null
          provider_metadata: Json
          queued_at: string
          recovery_method_id: string
          sending_at: string | null
          sent_at: string | null
          skipped_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          cancelled_at?: string | null
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
          provider_message_id?: string | null
          provider_metadata?: Json
          queued_at?: string
          recovery_method_id: string
          sending_at?: string | null
          sent_at?: string | null
          skipped_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          transport: Database["public"]["Enums"]["delivery_transport"]
          update_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          cancelled_at?: string | null
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
          provider_message_id?: string | null
          provider_metadata?: Json
          queued_at?: string
          recovery_method_id?: string
          sending_at?: string | null
          sent_at?: string | null
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
      create_update_delivery_queue: {
        Args: { p_creator_id: string; p_recipients: Json; p_update_id: string }
        Returns: Json
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
      is_published_creator_media: {
        Args: { object_name: string }
        Returns: boolean
      }
    }
    Enums: {
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
      delivery_status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
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
      delivery_status: [
        "queued",
        "sending",
        "sent",
        "delivered",
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

