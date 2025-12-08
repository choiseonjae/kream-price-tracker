export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          plan: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          plan?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          plan?: string
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          kream_url: string
          title: string | null
          brand: string | null
          model_code: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kream_url: string
          title?: string | null
          brand?: string | null
          model_code?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kream_url?: string
          title?: string | null
          brand?: string | null
          model_code?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      price_snapshots: {
        Row: {
          id: string
          item_id: string
          source: 'KREAM' | 'JP_RETAIL' | 'JP_RESALE'
          price: number
          currency: string
          captured_at: string
        }
        Insert: {
          id?: string
          item_id: string
          source: 'KREAM' | 'JP_RETAIL' | 'JP_RESALE'
          price: number
          currency: string
          captured_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          source?: 'KREAM' | 'JP_RETAIL' | 'JP_RESALE'
          price?: number
          currency?: string
          captured_at?: string
        }
      }
      watch_items: {
        Row: {
          id: string
          user_id: string
          item_id: string
          jp_reference_price: number | null
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          jp_reference_price?: number | null
          currency?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          jp_reference_price?: number | null
          currency?: string
          created_at?: string
        }
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          item_id: string
          direction: 'KR_MORE_EXPENSIVE' | 'JP_MORE_EXPENSIVE'
          threshold_percent: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          direction: 'KR_MORE_EXPENSIVE' | 'JP_MORE_EXPENSIVE'
          threshold_percent: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          direction?: 'KR_MORE_EXPENSIVE' | 'JP_MORE_EXPENSIVE'
          threshold_percent?: number
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      price_source: 'KREAM' | 'JP_RETAIL' | 'JP_RESALE'
      alert_direction: 'KR_MORE_EXPENSIVE' | 'JP_MORE_EXPENSIVE'
    }
  }
}
