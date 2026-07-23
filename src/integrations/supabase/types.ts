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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
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
      familias: {
        Row: {
          created_at: string
          icono: string
          id: string
          nombre: string
          orden: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icono?: string
          id?: string
          nombre: string
          orden?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icono?: string
          id?: string
          nombre?: string
          orden?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      gestiones: {
        Row: {
          borrador_step: number | null
          categoria: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          confirm_token: string | null
          created_at: string
          descripcion: string | null
          estado: string
          fecha_matriculacion: string | null
          fotos: string[] | null
          id: string
          importe: string | null
          km: string | null
          marca: string | null
          matricula: string | null
          mensaje: string | null
          modelo: string | null
          motor: string | null
          objecion: string | null
          pedido_pena: boolean
          piezas: string | null
          subfamilia: string | null
          taller_id: string | null
          taller_nombre: string | null
          vehiculo: string | null
          vin: string | null
          wa_abierto: boolean
        }
        Insert: {
          borrador_step?: number | null
          categoria?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          confirm_token?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_matriculacion?: string | null
          fotos?: string[] | null
          id?: string
          importe?: string | null
          km?: string | null
          marca?: string | null
          matricula?: string | null
          mensaje?: string | null
          modelo?: string | null
          motor?: string | null
          objecion?: string | null
          pedido_pena?: boolean
          piezas?: string | null
          subfamilia?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
          vin?: string | null
          wa_abierto?: boolean
        }
        Update: {
          borrador_step?: number | null
          categoria?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          confirm_token?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_matriculacion?: string | null
          fotos?: string[] | null
          id?: string
          importe?: string | null
          km?: string | null
          marca?: string | null
          matricula?: string | null
          mensaje?: string | null
          modelo?: string | null
          motor?: string | null
          objecion?: string | null
          pedido_pena?: boolean
          piezas?: string | null
          subfamilia?: string | null
          taller_id?: string | null
          taller_nombre?: string | null
          vehiculo?: string | null
          vin?: string | null
          wa_abierto?: boolean
        }
        Relationships: []
      }
      pedidos_pena: {
        Row: {
          audio_url: string | null
          confirm_token: string | null
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
          transcripcion: string | null
          vehiculo: string | null
        }
        Insert: {
          audio_url?: string | null
          confirm_token?: string | null
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
          transcripcion?: string | null
          vehiculo?: string | null
        }
        Update: {
          audio_url?: string | null
          confirm_token?: string | null
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
          transcripcion?: string | null
          vehiculo?: string | null
        }
        Relationships: []
      }
      plate_lookups_cache: {
        Row: {
          data: Json
          fetched_at: string
          plate: string
        }
        Insert: {
          data: Json
          fetched_at?: string
          plate: string
        }
        Update: {
          data?: Json
          fetched_at?: string
          plate?: string
        }
        Relationships: []
      }
      plate_lookups_history: {
        Row: {
          cached: boolean
          created_at: string
          error: string | null
          id: string
          marca: string | null
          modelo: string | null
          ok: boolean
          plate: string
          taller_id: string | null
          user_id: string
          vehiculo: string | null
        }
        Insert: {
          cached?: boolean
          created_at?: string
          error?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          ok?: boolean
          plate: string
          taller_id?: string | null
          user_id: string
          vehiculo?: string | null
        }
        Update: {
          cached?: boolean
          created_at?: string
          error?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          ok?: boolean
          plate?: string
          taller_id?: string | null
          user_id?: string
          vehiculo?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ciudad: string
          created_at: string
          mecanico: string
          role: Database["public"]["Enums"]["app_role"]
          taller_id: string
          taller_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ciudad?: string
          created_at?: string
          mecanico?: string
          role: Database["public"]["Enums"]["app_role"]
          taller_id: string
          taller_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ciudad?: string
          created_at?: string
          mecanico?: string
          role?: Database["public"]["Enums"]["app_role"]
          taller_id?: string
          taller_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subfamilias: {
        Row: {
          created_at: string
          familia_id: string
          id: string
          mensaje: string
          nombre: string
          orden: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          familia_id: string
          id?: string
          mensaje?: string
          nombre: string
          orden?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          familia_id?: string
          id?: string
          mensaje?: string
          nombre?: string
          orden?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subfamilias_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      talleres: {
        Row: {
          activo: boolean
          ciudad: string
          created_at: string
          nombre: string
          taller_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad?: string
          created_at?: string
          nombre: string
          taller_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string
          created_at?: string
          nombre?: string
          taller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actualizar_estado_pedido_pena: {
        Args: { _estado: string; _token: string }
        Returns: {
          estado: string
          id: string
        }[]
      }
      confirmar_gestion: {
        Args: { _token: string }
        Returns: {
          estado: string
          id: string
          matricula: string
          previous_estado: string
        }[]
      }
      get_pedido_pena_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          estado: string
          id: string
          matricula: string
          piezas: string
          taller_nombre: string
          vehiculo: string
        }[]
      }
      get_user_role: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_taller_id: { Args: { _uid: string }; Returns: string }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_pena: { Args: { _uid: string }; Returns: boolean }
      rechazar_gestion: {
        Args: { _token: string }
        Returns: {
          estado: string
          id: string
          matricula: string
          previous_estado: string
        }[]
      }
      rename_taller_id: {
        Args: { _new: string; _old: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "taller-1"
        | "taller-2"
        | "pena"
        | "taller-3"
        | "taller-4"
        | "taller-5"
        | "admin"
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
    Enums: {
      app_role: [
        "taller-1",
        "taller-2",
        "pena",
        "taller-3",
        "taller-4",
        "taller-5",
        "admin",
      ],
    },
  },
} as const
