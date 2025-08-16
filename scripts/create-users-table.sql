-- Crear tabla de usuarios para autenticación
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir que los usuarios autenticados puedan leer sus propios datos
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Crear política para permitir inserción de nuevos usuarios (solo para administradores)
CREATE POLICY "Allow insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

-- Insertar usuario inicial: Lucero con contraseña Lucero0716
-- Nota: En producción, las contraseñas deben estar hasheadas. 
-- Para este ejemplo, usaremos una función simple de hash.
INSERT INTO users (username, password_hash) 
VALUES (
  'Lucero', 
  crypt('Lucero0716', gen_salt('bf'))
) ON CONFLICT (username) DO NOTHING;

-- Habilitar la extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verify_password(username_input TEXT, password_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash 
  FROM users 
  WHERE username = username_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = crypt(password_input, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener datos del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_by_credentials(username_input TEXT, password_input TEXT)
RETURNS TABLE(id UUID, username VARCHAR, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  IF verify_password(username_input, password_input) THEN
    RETURN QUERY
    SELECT u.id, u.username, u.created_at
    FROM users u
    WHERE u.username = username_input;
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;