export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "tutor";
export type TaskType = "multiple_choice" | "short_answer" | "structured";
export type AttemptResult = "correct" | "partial" | "incorrect";
export type AlertSeverity = "low" | "medium" | "high";
export type ActivityEventType =
  | "task_submit"
  | "lesson_start"
  | "session_booked"
  | "other";

export type HomeworkSubmissionStatus = "draft" | "submitted";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      tutor_student_links: {
        Row: {
          id: string;
          tutor_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tutor_student_links"]["Insert"]>;
      };
      tutor_classes: {
        Row: {
          id: string;
          tutor_id: string;
          subject_id: string;
          title: string;
          code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          subject_id: string;
          title?: string;
          code: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tutor_classes"]["Insert"]>;
      };
      subjects: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          enrolled_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
      };
      lessons: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          order_index: number;
          due_at: string | null;
          assigned_student_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          order_index: number;
          due_at?: string | null;
          assigned_student_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
      };
      lesson_steps: {
        Row: {
          id: string;
          lesson_id: string;
          order_index: number;
          title: string;
          task_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          order_index: number;
          title: string;
          task_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lesson_steps"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          type: TaskType;
          prompt: string;
          options: Json | null;
          correct_answer: string | null;
          accepted_variants: string[] | null;
          misconception_tags: string[] | null;
          hint_text: string | null;
          explanation_text: string | null;
          rules_hint: Json | null;
          topic_tag: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: TaskType;
          prompt: string;
          options?: Json | null;
          correct_answer?: string | null;
          accepted_variants?: string[] | null;
          misconception_tags?: string[] | null;
          hint_text?: string | null;
          explanation_text?: string | null;
          rules_hint?: Json | null;
          topic_tag?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      task_attempts: {
        Row: {
          id: string;
          student_id: string;
          task_id: string;
          lesson_id: string;
          raw_answer: string;
          normalized_answer: string | null;
          result: AttemptResult;
          score: number;
          feedback_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          task_id: string;
          lesson_id: string;
          raw_answer: string;
          normalized_answer?: string | null;
          result: AttemptResult;
          score: number;
          feedback_payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_attempts"]["Insert"]>;
      };
      feedback_events: {
        Row: {
          id: string;
          task_attempt_id: string;
          event_type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_attempt_id: string;
          event_type: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback_events"]["Insert"]>;
      };
      progress_records: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string | null;
          lesson_id: string | null;
          completion_pct: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id?: string | null;
          lesson_id?: string | null;
          completion_pct: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["progress_records"]["Insert"]>;
      };
      streak_records: {
        Row: {
          student_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["streak_records"]["Insert"]>;
      };
      activity_events: {
        Row: {
          id: string;
          student_id: string;
          type: ActivityEventType;
          metadata: Json | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          type: ActivityEventType;
          metadata?: Json | null;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Insert"]>;
      };
      alerts: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string;
          severity: AlertSeverity;
          reason_code: string;
          message: string;
          suggested_action: string | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          tutor_id: string;
          severity: AlertSeverity;
          reason_code: string;
          message: string;
          suggested_action?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
      };
      homework_submissions: {
        Row: {
          id: string;
          student_id: string;
          lesson_id: string;
          task_id: string | null;
          comment_text: string | null;
          strokes_json: Json | null;
          image_storage_path: string | null;
          status: HomeworkSubmissionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          lesson_id: string;
          task_id?: string | null;
          comment_text?: string | null;
          strokes_json?: Json | null;
          image_storage_path?: string | null;
          status?: HomeworkSubmissionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["homework_submissions"]["Insert"]>;
      };
      tutor_notes: {
        Row: {
          id: string;
          tutor_id: string;
          student_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          student_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tutor_notes"]["Insert"]>;
      };
      help_requests: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          tutor_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["help_requests"]["Insert"]>;
      };
      tutor_whiteboard_lessons: {
        Row: {
          id: string;
          tutor_id: string;
          title: string;
          image_storage_path: string;
          strokes_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          title?: string;
          image_storage_path: string;
          strokes_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["tutor_whiteboard_lessons"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      task_type: TaskType;
      attempt_result: AttemptResult;
      alert_severity: AlertSeverity;
      activity_event_type: ActivityEventType;
    };
  };
}
