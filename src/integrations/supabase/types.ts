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
      clientes: {
        Row: {
          created_at: string
          id: string
          km: string | null
          matricula: string | null
          nombre: string | null
          notas: string | null
          taller_id: string | null
          taller_nombre: string | null
          telefono: string | null
          total_gestiones: number
          ultima_gestion: string | null
          updated_at: string
          vehiculo: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          km?: string | null
          matricula?: string | null
          nombre?: string | null
          notas?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          telefono?: string | null
          total_gestiones?: number
          ultima_gestion?: string | null
          updated_at?: string
          vehiculo?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          km?: string | null
          matricula?: string | null
          nombre?: string | null
          notas?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          telefono?: string | null
          total_gestiones?: number
          ultima_gestion?: string | null
          updated_at?: string
          vehiculo?: string | null
        }
        Relationships: []
      }
      gestiones: {
        Row: {
          categoria: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          confirm_token: string | null
          created_at: string
          descripcion: string | null
          estado: string
          fotos: string[] | null
          id: string
          importe: string | null
          km: string | null
          matricula: string | null
          objecion: string | null
          pedido_pena: boolean
          piezas: string | null
          subfamilia: string | null
          taller_id: string | null
          taller_nombre: string | null
          vehiculo: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          confirm_token?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          fotos?: string[] | null
          id?: string
          importe?: string | null
          km?: string | null
          matricula?: string | null
          objecion?: string | null
          pedido_pena?: boolean
          piezas?: string | null
          subfamilia?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          confirm_token?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          fotos?: string[] | null
          id?: string
          importe?: string | null
          km?: string | null
          matricula?: string | null
          objecion?: string | null
          pedido_pena?: boolean
          piezas?: string | null
          subfamilia?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
        }
        Relationships: []
      }
      pedidos_pena: {
        Row: {
          created_at: string
          estado: string
          fotos: string[] | null
          id: string
          matricula: string | null
          notas: string | null
          pedido_numero: number | null
          piezas: string | null
          taller_id: string | null
          taller_nombre: string | null
          vehiculo: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          fotos?: string[] | null
          id?: string
          matricula?: string | null
          notas?: string | null
          pedido_numero?: number | null
          piezas?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          fotos?: string[] | null
          id?: string
          matricula?: string | null
          notas?: string | null
          pedido_numero?: number | null
          piezas?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
