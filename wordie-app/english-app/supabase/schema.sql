-- =============================================
-- Schema para Wordie — English Learning App
-- Ejecuta esto en Supabase → SQL Editor
-- =============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT,
  level       INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  xp          INTEGER DEFAULT 0,
  streak      INTEGER DEFAULT 0,
  last_study_date DATE,
  total_exercises INTEGER DEFAULT 0,
  correct_exercises INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de ejercicios
CREATE TABLE IF NOT EXISTS public.exercise_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('vocabulary', 'grammar')),
  level         INTEGER NOT NULL,
  correct       BOOLEAN NOT NULL,
  word_or_topic TEXT,
  exercise_type TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Maestría de vocabulario (para espaciado de repetición)
CREATE TABLE IF NOT EXISTS public.vocabulary_mastery (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word            TEXT NOT NULL,
  correct_count   INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  mastery_score   FLOAT DEFAULT 0.0,
  next_review     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exercise_history_user ON public.exercise_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_created ON public.exercise_history(created_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery_user ON public.vocabulary_mastery(user_id);

-- RLS (Row Level Security) — cada usuario solo ve sus datos
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_mastery ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuarios ven su propio perfil"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios actualizan su propio perfil"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuarios insertan su propio perfil"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para exercise_history
CREATE POLICY "Usuarios ven su propio historial"
  ON public.exercise_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios insertan su propio historial"
  ON public.exercise_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para vocabulary_mastery
CREATE POLICY "Usuarios ven su propia maestría"
  ON public.vocabulary_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios modifican su propia maestría"
  ON public.vocabulary_mastery FOR ALL USING (auth.uid() = user_id);

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
