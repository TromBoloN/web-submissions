export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          id: string;
          metadata: NonNullable<Json>;
          target_id: string | null;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      case_study: {
        Row: {
          content_md: string;
          id: boolean;
          release_at: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          content_md?: string;
          id?: boolean;
          release_at?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          content_md?: string;
          id?: boolean;
          release_at?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_study_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      competition_settings: {
        Row: {
          contact_whatsapp: string | null;
          event_name: string;
          event_track: string;
          final_results_released: boolean;
          finalist_count: number;
          gallery_new_badge_days: number;
          id: boolean;
          juknis_url: string | null;
          preliminary_results_released: boolean;
          ranking_published: boolean;
          showcase_consent_locked_at: string | null;
          showcase_finalists_published_at: string | null;
          showcase_published_at: string | null;
          submission_closes_at: string;
          updated_at: string;
          winners_published_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          contact_whatsapp?: string | null;
          event_name?: string;
          event_track?: string;
          final_results_released?: boolean;
          finalist_count?: number;
          gallery_new_badge_days?: number;
          id?: boolean;
          juknis_url?: string | null;
          preliminary_results_released?: boolean;
          ranking_published?: boolean;
          showcase_consent_locked_at?: string | null;
          showcase_finalists_published_at?: string | null;
          showcase_published_at?: string | null;
          submission_closes_at: string;
          updated_at?: string;
          winners_published_at?: string | null;
        };
        Update: {
          contact_whatsapp?: string | null;
          event_name?: string;
          event_track?: string;
          final_results_released?: boolean;
          finalist_count?: number;
          gallery_new_badge_days?: number;
          id?: boolean;
          juknis_url?: string | null;
          preliminary_results_released?: boolean;
          ranking_published?: boolean;
          showcase_consent_locked_at?: string | null;
          showcase_finalists_published_at?: string | null;
          showcase_published_at?: string | null;
          submission_closes_at?: string;
          updated_at?: string;
          winners_published_at?: string | null;
        };
        Relationships: [];
      };
      competition_stages: {
        Row: {
          description: string;
          ends_on: string;
          is_system: boolean;
          key: string;
          show_on_track: boolean;
          sort_order: number;
          starts_on: string;
          status_override: string | null;
          time_label: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          description?: string;
          ends_on: string;
          is_system?: boolean;
          key: string;
          show_on_track?: boolean;
          sort_order?: number;
          starts_on: string;
          status_override?: string | null;
          time_label?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          description?: string;
          ends_on?: string;
          is_system?: boolean;
          key?: string;
          show_on_track?: boolean;
          sort_order?: number;
          starts_on?: string;
          status_override?: string | null;
          time_label?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "competition_stages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      final_presentation: {
        Row: {
          id: boolean;
          logistics_published: boolean;
          meeting_url: string | null;
          note: string;
          presentation_minutes: number;
          qa_minutes: number;
          updated_at: string;
          updated_by: string | null;
          venue: string;
        };
        ComputedFields: never;
        Insert: {
          id?: boolean;
          logistics_published?: boolean;
          meeting_url?: string | null;
          note?: string;
          presentation_minutes?: number;
          qa_minutes?: number;
          updated_at?: string;
          updated_by?: string | null;
          venue?: string;
        };
        Update: {
          id?: boolean;
          logistics_published?: boolean;
          meeting_url?: string | null;
          note?: string;
          presentation_minutes?: number;
          qa_minutes?: number;
          updated_at?: string;
          updated_by?: string | null;
          venue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "final_presentation_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      final_scores: {
        Row: {
          case_study_fit_score: number | null;
          code_quality_score: number | null;
          created_at: string;
          documentation_score: number | null;
          feedback: string | null;
          functionality_score: number | null;
          id: string;
          judge_id: string;
          locked_at: string | null;
          presentation_qa_score: number | null;
          private_note: string | null;
          status: Database["public"]["Enums"]["score_status_type"];
          team_id: string;
          total_weighted_score: number | null;
          ui_ux_score: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          case_study_fit_score?: number | null;
          code_quality_score?: number | null;
          created_at?: string;
          documentation_score?: number | null;
          feedback?: string | null;
          functionality_score?: number | null;
          id?: string;
          judge_id: string;
          locked_at?: string | null;
          presentation_qa_score?: number | null;
          private_note?: string | null;
          status?: Database["public"]["Enums"]["score_status_type"];
          team_id: string;
          total_weighted_score?: never;
          ui_ux_score?: number | null;
          updated_at?: string;
        };
        Update: {
          case_study_fit_score?: number | null;
          code_quality_score?: number | null;
          created_at?: string;
          documentation_score?: number | null;
          feedback?: string | null;
          functionality_score?: number | null;
          id?: string;
          judge_id?: string;
          locked_at?: string | null;
          presentation_qa_score?: number | null;
          private_note?: string | null;
          status?: Database["public"]["Enums"]["score_status_type"];
          team_id?: string;
          total_weighted_score?: never;
          ui_ux_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "final_scores_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "final_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "final_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "final_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "preliminary_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "final_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      finalist_notice: {
        Row: {
          finalist_message: string;
          id: boolean;
          is_published: boolean;
          non_finalist_message: string;
          published_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          finalist_message?: string;
          id?: boolean;
          is_published?: boolean;
          non_finalist_message?: string;
          published_at?: string | null;
          updated_at?: string;
        };
        Update: {
          finalist_message?: string;
          id?: boolean;
          is_published?: boolean;
          non_finalist_message?: string;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      judge_recusals: {
        Row: {
          created_at: string;
          id: string;
          judge_id: string;
          reason: string;
          stage: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          judge_id: string;
          reason: string;
          stage: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          judge_id?: string;
          reason?: string;
          stage?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judge_recusals_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judge_recusals_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "final_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "judge_recusals_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "preliminary_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "judge_recusals_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      preliminary_scores: {
        Row: {
          case_study_fit_score: number | null;
          code_quality_score: number | null;
          created_at: string;
          documentation_score: number | null;
          feedback: string | null;
          functionality_score: number | null;
          id: string;
          judge_id: string;
          locked_at: string | null;
          private_note: string | null;
          status: Database["public"]["Enums"]["score_status_type"];
          team_id: string;
          total_weighted_score: number | null;
          ui_ux_score: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          case_study_fit_score?: number | null;
          code_quality_score?: number | null;
          created_at?: string;
          documentation_score?: number | null;
          feedback?: string | null;
          functionality_score?: number | null;
          id?: string;
          judge_id: string;
          locked_at?: string | null;
          private_note?: string | null;
          status?: Database["public"]["Enums"]["score_status_type"];
          team_id: string;
          total_weighted_score?: never;
          ui_ux_score?: number | null;
          updated_at?: string;
        };
        Update: {
          case_study_fit_score?: number | null;
          code_quality_score?: number | null;
          created_at?: string;
          documentation_score?: number | null;
          feedback?: string | null;
          functionality_score?: number | null;
          id?: string;
          judge_id?: string;
          locked_at?: string | null;
          private_note?: string | null;
          status?: Database["public"]["Enums"]["score_status_type"];
          team_id?: string;
          total_weighted_score?: never;
          ui_ux_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preliminary_scores_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "preliminary_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "final_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "preliminary_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "preliminary_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "preliminary_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          judge_stage: Database["public"]["Enums"]["judge_stage_type"] | null;
          role: Database["public"]["Enums"]["user_role_type"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          judge_stage?: Database["public"]["Enums"]["judge_stage_type"] | null;
          role?: Database["public"]["Enums"]["user_role_type"];
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          judge_stage?: Database["public"]["Enums"]["judge_stage_type"] | null;
          role?: Database["public"]["Enums"]["user_role_type"];
        };
        Relationships: [];
      };
      score_sanctions: {
        Row: {
          created_at: string;
          created_by: string | null;
          criterion: string;
          id: string;
          points: number;
          reason: string;
          stage: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          criterion: string;
          id?: string;
          points: number;
          reason: string;
          stage: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          criterion?: string;
          id?: string;
          points?: number;
          reason?: string;
          stage?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_sanctions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sanctions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "final_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "score_sanctions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "preliminary_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "score_sanctions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          github_url: string;
          id: number;
          live_demo_url: string;
          notes_for_judges: string;
          status: string;
          submission_id: string;
          team_id: string;
          video_url: string;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          github_url?: string;
          id?: never;
          live_demo_url?: string;
          notes_for_judges?: string;
          status: string;
          submission_id: string;
          team_id: string;
          video_url?: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          github_url?: string;
          id?: never;
          live_demo_url?: string;
          notes_for_judges?: string;
          status?: string;
          submission_id?: string;
          team_id?: string;
          video_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submission_history_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      site_content: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_content_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          first_submitted_at: string | null;
          github_url: string;
          id: string;
          link_check: Json | null;
          link_checked_at: string | null;
          live_demo_url: string;
          notes_for_judges: string;
          status: Database["public"]["Enums"]["submission_status_type"];
          submitted_at: string;
          team_id: string;
          updated_at: string;
          video_url: string;
        };
        ComputedFields: never;
        Insert: {
          first_submitted_at?: string | null;
          github_url?: string;
          id?: string;
          link_check?: Json | null;
          link_checked_at?: string | null;
          live_demo_url?: string;
          notes_for_judges?: string;
          status?: Database["public"]["Enums"]["submission_status_type"];
          submitted_at?: string;
          team_id: string;
          updated_at?: string;
          video_url?: string;
        };
        Update: {
          first_submitted_at?: string | null;
          github_url?: string;
          id?: string;
          link_check?: Json | null;
          link_checked_at?: string | null;
          live_demo_url?: string;
          notes_for_judges?: string;
          status?: Database["public"]["Enums"]["submission_status_type"];
          submitted_at?: string;
          team_id?: string;
          updated_at?: string;
          video_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: true;
            referencedRelation: "final_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "submissions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: true;
            referencedRelation: "preliminary_ranking";
            referencedColumns: ["team_id"];
          },
          {
            foreignKeyName: "submissions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: true;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          institution: string;
          is_disqualified: boolean;
          is_finalist: boolean;
          leader_name: string;
          members: string[];
          profile_id: string;
          showcase_consent: boolean;
          showcase_description: string;
          showcase_image_path: string | null;
          showcase_is_finalist: boolean | null;
          showcase_title: string;
          team_code: string;
          team_name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          institution: string;
          is_disqualified?: boolean;
          is_finalist?: boolean;
          leader_name: string;
          members?: string[];
          profile_id: string;
          showcase_consent?: boolean;
          showcase_description?: string;
          showcase_image_path?: string | null;
          showcase_is_finalist?: boolean | null;
          showcase_title?: string;
          team_code: string;
          team_name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution?: string;
          is_disqualified?: boolean;
          is_finalist?: boolean;
          leader_name?: string;
          members?: string[];
          profile_id?: string;
          showcase_consent?: boolean;
          showcase_description?: string;
          showcase_image_path?: string | null;
          showcase_is_finalist?: boolean | null;
          showcase_title?: string;
          team_code?: string;
          team_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      final_ranking: {
        Row: {
          avg_score: number | null;
          judges_count: number | null;
          rank: number | null;
          raw_avg_score: number | null;
          sanction_deduction: number | null;
          team_code: string;
          team_id: string;
          team_name: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
      preliminary_ranking: {
        Row: {
          avg_score: number | null;
          judges_count: number | null;
          rank: number | null;
          raw_avg_score: number | null;
          sanction_deduction: number | null;
          team_code: string;
          team_id: string;
          team_name: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      current_user_judge_stage: { Args: Record<PropertyKey, never>; Returns: string };
      current_user_role: { Args: Record<PropertyKey, never>; Returns: string };
      get_my_final_presentation: {
        Args: Record<PropertyKey, never>;
        Returns: {
          meeting_url: string;
          note: string;
          presentation_minutes: number;
          qa_minutes: number;
          venue: string;
        }[];
      };
      get_my_finalist_notice: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_finalist: boolean;
          message: string;
          published_at: string;
        }[];
      };
      get_my_results: { Args: Record<PropertyKey, never>; Returns: Json };
      get_preliminary_scores_for_final: {
        Args: { p_team_id: string };
        Returns: {
          case_study_fit_score: number;
          code_quality_score: number;
          documentation_score: number;
          feedback: string;
          functionality_score: number;
          judge_label: number;
          total_weighted_score: number;
          ui_ux_score: number;
        }[];
      };
      get_public_competition_schedule: {
        Args: Record<PropertyKey, never>;
        Returns: {
          description: string;
          ends_on: string;
          key: string;
          show_on_track: boolean;
          sort_order: number;
          starts_on: string;
          status_override: string;
          time_label: string;
          title: string;
        }[];
      };
      get_public_contact_whatsapp: { Args: Record<PropertyKey, never>; Returns: string };
      get_public_event_info: {
        Args: Record<PropertyKey, never>;
        Returns: {
          event_name: string;
          event_track: string;
          finalist_count: number;
        }[];
      };
      get_public_ranking: {
        Args: Record<PropertyKey, never>;
        Returns: {
          institution: string;
          is_own_team: boolean;
          rank: number;
          score: number;
          stage: string;
          team_name: string;
        }[];
      };
      get_public_showcase: {
        Args: Record<PropertyKey, never>;
        Returns: {
          github_url: string;
          live_demo_ok: boolean;
          live_demo_url: string;
          showcase_description: string;
          showcase_image_path: string;
          showcase_title: string;
          team_name: string;
          video_url: string;
        }[];
      };
      get_public_showcase_winners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          final_score: number;
          github_url: string;
          live_demo_url: string;
          showcase_description: string;
          showcase_image_path: string;
          showcase_title: string;
          team_name: string;
          video_url: string;
          winner_rank: number;
        }[];
      };
      get_site_content: {
        Args: Record<PropertyKey, never>;
        Returns: {
          key: string;
          value: string;
        }[];
      };
      is_feedback_only_edit: { Args: { p_new: Json; p_old: Json }; Returns: boolean };
      judge_can_score_final: { Args: { p_team_id: string }; Returns: boolean };
      judge_can_score_preliminary: { Args: { p_team_id: string }; Returns: boolean };
      judge_can_view_team: { Args: { p_team_id: string }; Returns: boolean };
      publish_showcase_phase_one: { Args: Record<PropertyKey, never>; Returns: boolean };
      publish_showcase_phase_two: { Args: Record<PropertyKey, never>; Returns: boolean };
      publish_showcase_winners: { Args: Record<PropertyKey, never>; Returns: boolean };
      save_showcase_details: {
        Args: { p_consent: boolean; p_description: string; p_image_path: string | null; p_title: string };
        Returns: boolean;
      };
      score_sanction_deduction: { Args: { p_stage: string; p_team_id: string }; Returns: number };
      set_showcase_consent: { Args: { p_consent: boolean }; Returns: boolean };
      submission_open: { Args: Record<PropertyKey, never>; Returns: boolean };
      team_can_submit: { Args: { p_team_id: string }; Returns: boolean };
      update_my_score_feedback: { Args: { p_feedback: string; p_stage: string; p_team_id: string }; Returns: boolean };
    };
    Enums: {
      judge_stage_type: "preliminary" | "final" | "both";
      score_status_type: "draft" | "final";
      submission_status_type: "draft" | "submitted";
      user_role_type: "admin" | "judge" | "team";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      judge_stage_type: ["preliminary", "final", "both"],
      score_status_type: ["draft", "final"],
      submission_status_type: ["draft", "submitted"],
      user_role_type: ["admin", "judge", "team"],
    },
  },
} as const;
