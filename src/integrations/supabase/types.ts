export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assessment_notes: {
        Row: {
          assessment_id: string;
          author_email: string | null;
          author_user_id: string | null;
          body: string;
          clinic_id: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          author_email?: string | null;
          author_user_id?: string | null;
          body: string;
          clinic_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          author_email?: string | null;
          author_user_id?: string | null;
          body?: string;
          clinic_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_notes_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_psychoeducation: {
        Row: {
          assessment_id: string;
          content_id: string | null;
          created_at: string | null;
          id: string;
          is_manual: boolean | null;
          topic_id: string;
          trigger_reason: string | null;
          viewed_at: string | null;
        };
        Insert: {
          assessment_id: string;
          content_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_manual?: boolean | null;
          topic_id: string;
          trigger_reason?: string | null;
          viewed_at?: string | null;
        };
        Update: {
          assessment_id?: string;
          content_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_manual?: boolean | null;
          topic_id?: string;
          trigger_reason?: string | null;
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_psychoeducation_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_psychoeducation_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "psychoeducation_contents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_psychoeducation_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "psychoeducation_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          birth_date: string | null;
          clinic_id: string;
          consent_at: string | null;
          consent_ip: string | null;
          consent_lgpd: boolean;
          contact_id: string | null;
          created_at: string;
          doctor_id: string | null;
          id: string;
          informant_name: string | null;
          informant_relation: string | null;
          invitation_id: string | null;
          main_complaint: string | null;
          respondent_age: number | null;
          respondent_email: string;
          respondent_name: string;
          respondent_phone: string | null;
          respondent_sex: string | null;
          respondent_type: string;
          risk_flags: Json;
          status: string;
          submitted_at: string;
          summary: Json;
          symptom_path: Json;
        };
        Insert: {
          birth_date?: string | null;
          clinic_id: string;
          consent_at?: string | null;
          consent_ip?: string | null;
          consent_lgpd?: boolean;
          contact_id?: string | null;
          created_at?: string;
          doctor_id?: string | null;
          id?: string;
          informant_name?: string | null;
          informant_relation?: string | null;
          invitation_id?: string | null;
          main_complaint?: string | null;
          respondent_age?: number | null;
          respondent_email: string;
          respondent_name: string;
          respondent_phone?: string | null;
          respondent_sex?: string | null;
          respondent_type?: string;
          risk_flags?: Json;
          status?: string;
          submitted_at?: string;
          summary?: Json;
          symptom_path?: Json;
        };
        Update: {
          birth_date?: string | null;
          clinic_id?: string;
          consent_at?: string | null;
          consent_ip?: string | null;
          consent_lgpd?: boolean;
          contact_id?: string | null;
          created_at?: string;
          doctor_id?: string | null;
          id?: string;
          informant_name?: string | null;
          informant_relation?: string | null;
          invitation_id?: string | null;
          main_complaint?: string | null;
          respondent_age?: number | null;
          respondent_email?: string;
          respondent_name?: string;
          respondent_phone?: string | null;
          respondent_sex?: string | null;
          respondent_type?: string;
          risk_flags?: Json;
          status?: string;
          submitted_at?: string;
          summary?: Json;
          symptom_path?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctor_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_user_id: string | null;
          clinic_id: string | null;
          created_at: string;
          details: Json;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          clinic_id?: string | null;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          clinic_id?: string | null;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      clinic_psychoeducation_settings: {
        Row: {
          auto_trigger: boolean | null;
          clinic_id: string;
          created_at: string | null;
          custom_intro: string | null;
          id: string;
          is_enabled: boolean | null;
          topic_id: string;
          updated_at: string | null;
        };
        Insert: {
          auto_trigger?: boolean | null;
          clinic_id: string;
          created_at?: string | null;
          custom_intro?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          topic_id: string;
          updated_at?: string | null;
        };
        Update: {
          auto_trigger?: boolean | null;
          clinic_id?: string;
          created_at?: string | null;
          custom_intro?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          topic_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinic_psychoeducation_settings_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinic_psychoeducation_settings_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "psychoeducation_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      clinic_subscriptions: {
        Row: {
          canceled_at: string | null;
          clinic_id: string;
          created_at: string;
          current_period_end: string | null;
          id: string;
          monthly_price_cents: number | null;
          notes: string | null;
          plan_code: string;
          started_at: string;
          status: string;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          canceled_at?: string | null;
          clinic_id: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          monthly_price_cents?: number | null;
          notes?: string | null;
          plan_code: string;
          started_at?: string;
          status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          canceled_at?: string | null;
          clinic_id?: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          monthly_price_cents?: number | null;
          notes?: string | null;
          plan_code?: string;
          started_at?: string;
          status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: true;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_code_fkey";
            columns: ["plan_code"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["code"];
          },
        ];
      };
      clinics: {
        Row: {
          about: string | null;
          accent_color: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          done_copy: string | null;
          favicon_url: string | null;
          id: string;
          intro_copy: string | null;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          primary_color: string | null;
          slug: string;
          tagline: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          about?: string | null;
          accent_color?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          done_copy?: string | null;
          favicon_url?: string | null;
          id?: string;
          intro_copy?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          primary_color?: string | null;
          slug: string;
          tagline?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          about?: string | null;
          accent_color?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          done_copy?: string | null;
          favicon_url?: string | null;
          id?: string;
          intro_copy?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          primary_color?: string | null;
          slug?: string;
          tagline?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          clinic_id: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone_e164: string | null;
          updated_at: string;
        };
        Insert: {
          clinic_id: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Update: {
          clinic_id?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
      doctor_profiles: {
        Row: {
          clinic_id: string;
          created_at: string;
          display_name: string;
          id: string;
          is_listed: boolean;
          specialty: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          clinic_id: string;
          created_at?: string;
          display_name: string;
          id?: string;
          is_listed?: boolean;
          specialty?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          clinic_id?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_listed?: boolean;
          specialty?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          channel: string;
          clinic_id: string;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          status: string;
          token: string;
          used_at: string | null;
          whatsapp_message_sid: string | null;
          whatsapp_status: string | null;
        };
        Insert: {
          channel?: string;
          clinic_id: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          status?: string;
          token: string;
          used_at?: string | null;
          whatsapp_message_sid?: string | null;
          whatsapp_status?: string | null;
        };
        Update: {
          channel?: string;
          clinic_id?: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          status?: string;
          token?: string;
          used_at?: string | null;
          whatsapp_message_sid?: string | null;
          whatsapp_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      landing_settings: {
        Row: {
          created_at: string;
          eyebrow: string;
          headline_line1: string;
          headline_line2: string;
          id: string;
          share_description: string;
          share_image_path: string | null;
          share_image_url: string | null;
          share_image_version: number;
          share_title: string;
          singleton: boolean;
          subheadline: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          eyebrow?: string;
          headline_line1?: string;
          headline_line2?: string;
          id?: string;
          share_description?: string;
          share_image_path?: string | null;
          share_image_url?: string | null;
          share_image_version?: number;
          share_title?: string;
          singleton?: boolean;
          subheadline?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          eyebrow?: string;
          headline_line1?: string;
          headline_line2?: string;
          id?: string;
          share_description?: string;
          share_image_path?: string | null;
          share_image_url?: string | null;
          share_image_version?: number;
          share_title?: string;
          singleton?: boolean;
          subheadline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_longitudinal_records: {
        Row: {
          assessment_id: string;
          band: string | null;
          band_level: number | null;
          clinic_id: string;
          created_at: string;
          id: string;
          patient_email: string;
          patient_name: string;
          recorded_at: string;
          risk: boolean;
          scale_code: string;
          score: number;
        };
        Insert: {
          assessment_id: string;
          band?: string | null;
          band_level?: number | null;
          clinic_id: string;
          created_at?: string;
          id?: string;
          patient_email: string;
          patient_name: string;
          recorded_at?: string;
          risk?: boolean;
          scale_code: string;
          score: number;
        };
        Update: {
          assessment_id?: string;
          band?: string | null;
          band_level?: number | null;
          clinic_id?: string;
          created_at?: string;
          id?: string;
          patient_email?: string;
          patient_name?: string;
          recorded_at?: string;
          risk?: boolean;
          scale_code?: string;
          score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "patient_longitudinal_records_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_longitudinal_records_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          code: string;
          created_at: string;
          features: Json;
          id: string;
          is_active: boolean;
          max_professionals: number | null;
          max_units: number | null;
          monthly_price_cents: number | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          features?: Json;
          id?: string;
          is_active?: boolean;
          max_professionals?: number | null;
          max_units?: number | null;
          monthly_price_cents?: number | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          features?: Json;
          id?: string;
          is_active?: boolean;
          max_professionals?: number | null;
          max_units?: number | null;
          monthly_price_cents?: number | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      psychoeducation_contents: {
        Row: {
          body_md: string;
          created_at: string | null;
          external_links: Json | null;
          id: string;
          is_published: boolean | null;
          level: string;
          summary_pdf: string | null;
          title: string;
          topic_id: string;
          updated_at: string | null;
          version: string;
          video_urls: Json | null;
        };
        Insert: {
          body_md: string;
          created_at?: string | null;
          external_links?: Json | null;
          id?: string;
          is_published?: boolean | null;
          level: string;
          summary_pdf?: string | null;
          title: string;
          topic_id: string;
          updated_at?: string | null;
          version?: string;
          video_urls?: Json | null;
        };
        Update: {
          body_md?: string;
          created_at?: string | null;
          external_links?: Json | null;
          id?: string;
          is_published?: boolean | null;
          level?: string;
          summary_pdf?: string | null;
          title?: string;
          topic_id?: string;
          updated_at?: string | null;
          version?: string;
          video_urls?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "psychoeducation_contents_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "psychoeducation_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      psychoeducation_topics: {
        Row: {
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean | null;
          short_title: string | null;
          slug: string;
          sort_order: number | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          short_title?: string | null;
          slug: string;
          sort_order?: number | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          short_title?: string | null;
          slug?: string;
          sort_order?: number | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      scale_results: {
        Row: {
          answers: Json;
          assessment_id: string;
          band: string | null;
          band_level: number | null;
          created_at: string;
          estimated_items: string[];
          id: string;
          notes: string | null;
          risk: boolean;
          scale_code: string;
          scale_name: string;
          score: number | null;
        };
        Insert: {
          answers?: Json;
          assessment_id: string;
          band?: string | null;
          band_level?: number | null;
          created_at?: string;
          estimated_items?: string[];
          id?: string;
          notes?: string | null;
          risk?: boolean;
          scale_code: string;
          scale_name: string;
          score?: number | null;
        };
        Update: {
          answers?: Json;
          assessment_id?: string;
          band?: string | null;
          band_level?: number | null;
          created_at?: string;
          estimated_items?: string[];
          id?: string;
          notes?: string | null;
          risk?: boolean;
          scale_code?: string;
          scale_name?: string;
          score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "scale_results_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          clinic_id: string | null;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          clinic_id?: string | null;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          clinic_id?: string | null;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          assessment_id: string | null;
          body: string;
          clinic_id: string;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          id: string;
          invitation_id: string | null;
          kind: string;
          provider_sid: string | null;
          sent_at: string | null;
          status: string;
          to_phone: string;
          updated_at: string;
        };
        Insert: {
          assessment_id?: string | null;
          body: string;
          clinic_id: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          invitation_id?: string | null;
          kind?: string;
          provider_sid?: string | null;
          sent_at?: string | null;
          status?: string;
          to_phone: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string | null;
          body?: string;
          clinic_id?: string;
          contact_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          invitation_id?: string | null;
          kind?: string;
          provider_sid?: string | null;
          sent_at?: string | null;
          status?: string;
          to_phone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_clinic_access: { Args: { _clinic_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_global_admin: { Args: never; Returns: boolean };
      provision_new_clinic: {
        Args: {
          p_accent_color?: string;
          p_contact_email?: string;
          p_name: string;
          p_primary_color?: string;
          p_slug: string;
          p_tagline: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "clinico" | "doctor" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "clinico", "doctor", "staff"],
    },
  },
} as const;
