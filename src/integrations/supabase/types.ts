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
      bookings: {
        Row: {
          booking_date: string
          id: string
          pnr_number: string
          schedule_id: string
          status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          booking_date?: string
          id?: string
          pnr_number: string
          schedule_id: string
          status?: string
          total_amount: number
          user_id: string
        }
        Update: {
          booking_date?: string
          id?: string
          pnr_number?: string
          schedule_id?: string
          status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      passengers: {
        Row: {
          age: number
          booking_id: string
          gender: string
          id: string
          name: string
          seat_number: string
        }
        Insert: {
          age: number
          booking_id: string
          gender: string
          id?: string
          name: string
          seat_number: string
        }
        Update: {
          age?: number
          booking_id?: string
          gender?: string
          id?: string
          name?: string
          seat_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "passengers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          card_last4: string | null
          created_at: string
          id: string
          method: string
          reference: string
          schedule_id: string
          seats: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          method?: string
          reference: string
          schedule_id: string
          seats: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          method?: string
          reference?: string
          schedule_id?: string
          seats?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          arrival_time: string
          available_seats: number
          departure_time: string
          fare: number
          id: string
          journey_date: string
          train_id: string
          travel_class: string
        }
        Insert: {
          arrival_time: string
          available_seats: number
          departure_time: string
          fare: number
          id?: string
          journey_date: string
          train_id: string
          travel_class?: string
        }
        Update: {
          arrival_time?: string
          available_seats?: number
          departure_time?: string
          fare?: number
          id?: string
          journey_date?: string
          train_id?: string
          travel_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_train_id_fkey"
            columns: ["train_id"]
            isOneToOne: false
            referencedRelation: "trains"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          city: string
          id: string
          latitude: number | null
          longitude: number | null
          station_code: string
          station_name: string
        }
        Insert: {
          city: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          station_code: string
          station_name: string
        }
        Update: {
          city?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          station_code?: string
          station_name?: string
        }
        Relationships: []
      }
      train_stops: {
        Row: {
          arrival_time: string | null
          created_at: string
          day_offset: number
          departure_time: string | null
          distance_km: number
          halt_minutes: number
          id: string
          station_id: string
          stop_order: number
          train_id: string
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          day_offset?: number
          departure_time?: string | null
          distance_km?: number
          halt_minutes?: number
          id?: string
          station_id: string
          stop_order: number
          train_id: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          day_offset?: number
          departure_time?: string | null
          distance_km?: number
          halt_minutes?: number
          id?: string
          station_id?: string
          stop_order?: number
          train_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "train_stops_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "train_stops_train_id_fkey"
            columns: ["train_id"]
            isOneToOne: false
            referencedRelation: "trains"
            referencedColumns: ["id"]
          },
        ]
      }
      trains: {
        Row: {
          destination_station_id: string
          id: string
          source_station_id: string
          total_seats: number
          train_name: string
          train_number: string
        }
        Insert: {
          destination_station_id: string
          id?: string
          source_station_id: string
          total_seats: number
          train_name: string
          train_number: string
        }
        Update: {
          destination_station_id?: string
          id?: string
          source_station_id?: string
          total_seats?: number
          train_name?: string
          train_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "trains_destination_station_id_fkey"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trains_source_station_id_fkey"
            columns: ["source_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
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
      book_ticket: {
        Args: {
          p_passengers: Json
          p_payment_id: string
          p_schedule_id: string
        }
        Returns: string
      }
      cancel_booking: { Args: { p_booking_id: string }; Returns: boolean }
      confirm_payment: {
        Args: { p_card_last4: string; p_method?: string; p_payment_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          p_grant: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      start_payment: {
        Args: { p_schedule_id: string; p_seats: number }
        Returns: {
          amount: number
          payment_id: string
          reference: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "customer"],
    },
  },
} as const
