-- =============================================================
-- Meeting Room Management System - Supabase Schema
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================================
-- 2. system_settings
-- =============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. security_logs
-- =============================================================
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);

-- =============================================================
-- 4. account_lockouts
-- =============================================================
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL UNIQUE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_account_lockouts_user_email ON account_lockouts(user_email);

-- =============================================================
-- 5. mfa_settings
-- =============================================================
CREATE TABLE IF NOT EXISTS mfa_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  secret TEXT,
  backup_codes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 6. ip_whitelist
-- =============================================================
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ip_whitelist_ip ON ip_whitelist(ip_address);

-- =============================================================
-- 7. rooms - Meeting room definitions
-- =============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  floor TEXT NOT NULL,
  building TEXT DEFAULT 'HQ',
  capacity INTEGER NOT NULL,
  outlook_email TEXT NOT NULL UNIQUE,
  outlook_calendar_id TEXT,
  sensor_device_id TEXT,
  sensor_type TEXT DEFAULT 'tuya' CHECK (sensor_type IN ('tuya', 'manual')),
  amenities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rooms_building_floor ON rooms(building, floor);
CREATE INDEX idx_rooms_is_active ON rooms(is_active);
CREATE INDEX idx_rooms_outlook_email ON rooms(outlook_email);
CREATE INDEX idx_rooms_sensor_device_id ON rooms(sensor_device_id);

-- =============================================================
-- 8. bookings - Synced from Outlook / Graph API
-- =============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  outlook_event_id TEXT NOT NULL UNIQUE,
  organizer_email TEXT NOT NULL,
  organizer_name TEXT,
  subject TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  expected_attendees INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'completed')),
  cancelled_by TEXT CHECK (cancelled_by IN ('system_noshow', 'user', 'admin')),
  cancelled_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_room_start ON bookings(room_id, start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_organizer ON bookings(organizer_email);
CREATE INDEX idx_bookings_outlook_event ON bookings(outlook_event_id);
CREATE INDEX idx_bookings_start_end ON bookings(start_time, end_time);

-- =============================================================
-- 9. occupancy_events - Sensor readings
-- =============================================================
CREATE TABLE IF NOT EXISTS occupancy_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sensor_device_id TEXT NOT NULL,
  is_occupied BOOLEAN NOT NULL,
  person_count INTEGER,
  raw_payload JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_occupancy_room_detected ON occupancy_events(room_id, detected_at DESC);
CREATE INDEX idx_occupancy_device ON occupancy_events(sensor_device_id);
CREATE INDEX idx_occupancy_detected_at ON occupancy_events(detected_at DESC);

-- =============================================================
-- 10. noshow_incidents - No-show detection results
-- =============================================================
CREATE TABLE IF NOT EXISTS noshow_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  organizer_email TEXT NOT NULL,
  detection_method TEXT NOT NULL DEFAULT 'sensor' CHECK (detection_method IN ('sensor', 'manual', 'checkin_timeout')),
  grace_period_minutes INTEGER DEFAULT 10,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_cancelled BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);
CREATE INDEX idx_noshow_booking ON noshow_incidents(booking_id);
CREATE INDEX idx_noshow_room ON noshow_incidents(room_id);
CREATE INDEX idx_noshow_organizer ON noshow_incidents(organizer_email);
CREATE INDEX idx_noshow_detected_at ON noshow_incidents(detected_at DESC);

-- =============================================================
-- 11. daily_room_stats - Aggregated daily statistics
-- =============================================================
CREATE TABLE IF NOT EXISTS daily_room_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  noshow_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  booked_minutes INTEGER DEFAULT 0,
  occupied_minutes INTEGER DEFAULT 0,
  utilization_rate REAL,
  booking_rate REAL,
  ghost_booking_rate REAL,
  avg_occupancy REAL,
  peak_hour INTEGER,
  UNIQUE(room_id, date)
);
CREATE INDEX idx_daily_stats_room_date ON daily_room_stats(room_id, date DESC);
CREATE INDEX idx_daily_stats_date ON daily_room_stats(date DESC);

-- =============================================================
-- 12. audit_log - System audit trail
-- =============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor TEXT DEFAULT 'system',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);

-- =============================================================
-- Row Level Security - Enable on all tables
-- =============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE noshow_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_room_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS Policies - Deny all for authenticated (use service_role)
-- =============================================================
CREATE POLICY "deny_all" ON profiles FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON system_settings FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON security_logs FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON account_lockouts FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON mfa_settings FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON ip_whitelist FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON rooms FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON bookings FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON occupancy_events FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON noshow_incidents FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON daily_room_stats FOR ALL TO authenticated USING (false);
CREATE POLICY "deny_all" ON audit_log FOR ALL TO authenticated USING (false);

-- =============================================================
-- Trigger: handle_new_user - Auto-create profile on signup
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- Trigger: updated_at auto-update
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON mfa_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
