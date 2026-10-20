export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      competition_settings: {
        Row: {
          id: boolean;
          submission_closes_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          submission_closes_at: string;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          submission_closes_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      final_scores: {
        Row: {
          case_study_fit_score: number;
          code_quality_score: number;
          created_at: string;
          documentation_score: number;
          feedback: string | null;
          functionality_score: number;
          id: string;
          judge_id: string;
          presentation_qa_score: number;
          team_id: string;
          total_weighted_score: number | null;
          ui_ux_score: number;
          updated_at: string;
        };
        Insert: {
          case_study_fit_score: number;
          code_quality_score: number;
          created_at?: string;
          documentation_score: number;
          feedback?: string | null;
          functionality_score: number;
          id?: string;
          judge_id: string;
          presentation_qa_score: number;
          team_id: string;
          total_weighted_score?: number | null;
          ui_ux_score: number;
          updated_at?: string;
        };
        Update: {
          case_study_fit_score?: number;
          code_quality_score?: number;
          created_at?: string;
          documentation_score?: number;
          feedback?: string | null;
          functionality_score?: number;
          id?: string;
          judge_id?: string;
          presentation_qa_score?: number;
          team_id?: string;
          total_weighted_score?: number | null;
          ui_ux_score?: number;
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
      preliminary_scores: {
        Row: {
          case_study_fit_score: number;
          code_quality_score: number;
          created_at: string;
          documentation_score: number;
          feedback: string | null;
          functionality_score: number;
          id: string;
          judge_id: string;
          team_id: string;
          total_weighted_score: number | null;
          ui_ux_score: number;
          updated_at: string;
        };
        Insert: {
          case_study_fit_score: number;
          code_quality_score: number;
          created_at?: string;
          documentation_score: number;
          feedback?: string | null;
          functionality_score: number;
          id?: string;
          judge_id: string;
          team_id: string;
          total_weighted_score?: number | null;
          ui_ux_score: number;
          updated_at?: string;
        };
        Update: {
          case_study_fit_score?: number;
          code_quality_score?: number;
          created_at?: string;
          documentation_score?: number;
          feedback?: string | null;
          functionality_score?: number;
          id?: string;
          judge_id?: string;
          team_id?: string;
          total_weighted_score?: number | null;
          ui_ux_score?: number;
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
      submissions: {
        Row: {
          github_url: string;
          id: string;
          live_demo_url: string;
          status: Database["public"]["Enums"]["submission_status_type"];
          submitted_at: string;
          team_id: string;
          updated_at: string;
          video_url: string;
        };
        Insert: {
          github_url?: string;
          id?: string;
          live_demo_url?: string;
          status?: Database["public"]["Enums"]["submission_status_type"];
          submitted_at?: string;
          team_id: string;
          updated_at?: string;
          video_url?: string;
        };
        Update: {
          github_url?: string;
          id?: string;
          live_demo_url?: string;
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
          team_code: string;
          team_name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          institution: string;
          is_disqualified?: boolean;
          is_finalist?: boolean;
          leader_name: string;
          members?: string[];
          profile_id: string;
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
          team_code: string | null;
          team_id: string | null;
          team_name: string | null;
        };
        Relationships: [];
      };
      preliminary_ranking: {
        Row: {
          avg_score: number | null;
          judges_count: number | null;
          rank: number | null;
          team_code: string | null;
          team_id: string | null;
          team_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_judge_stage: { Args: never; Returns: string };
      current_user_role: { Args: never; Returns: string };
      judge_can_score_final: { Args: { p_team_id: string }; Returns: boolean };
      judge_can_score_preliminary: {
        Args: { p_team_id: string };
        Returns: boolean;
      };
      judge_can_view_team: { Args: { p_team_id: string }; Returns: boolean };
      submission_open: { Args: never; Returns: boolean };
      team_can_submit: { Args: { p_team_id: string }; Returns: boolean };
    };
    Enums: {
      judge_stage_type: "preliminary" | "final" | "both";
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
      judge_stage_type: ["preliminary", "final", "both"],
      submission_status_type: ["draft", "submitted"],
      user_role_type: ["admin", "judge", "team"],
    },
  },
} as const;
