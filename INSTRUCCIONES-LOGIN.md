# 🔐 Sistema de Autenticación - Lucero Glam Studio

## 📋 Instrucciones para Configurar el Login

### 1. Ejecutar Script SQL en Supabase

1. **Accede a tu proyecto de Supabase**
   - Ve a [supabase.com](https://supabase.com)
   - Inicia sesión y selecciona tu proyecto

2. **Abrir el Editor SQL**
   - En el panel izquierdo, haz clic en "SQL Editor"
   - Selecciona "New query"

3. **Ejecutar el Script**
   - Copia todo el contenido del archivo `scripts/create-users-table.sql`
   - Pégalo en el editor SQL
   - Haz clic en "Run" para ejecutar el script

### 2. Verificar la Instalación

El script creará:
- ✅ Tabla `users` con campos: id, username, password_hash, created_at, updated_at
- ✅ Extensión `pgcrypto` para encriptación de contraseñas
- ✅ Políticas RLS (Row Level Security)
- ✅ Funciones para verificación de contraseñas
- ✅ Usuario inicial: **Lucero** con contraseña **Lucero0716**

### 3. Credenciales de Acceso

```
Usuario: Lucero
Contraseña: Lucero0716
```

**⚠️ IMPORTANTE**: El login funciona de dos maneras:

1. **Modo Temporal** (antes de ejecutar el script SQL):
   - Las credenciales se verifican localmente en el frontend
   - Funciona inmediatamente sin configuración adicional
   - Ideal para probar la interfaz

2. **Modo Seguro** (después de ejecutar el script SQL):
   - Las credenciales se verifican en la base de datos de Supabase
   - Contraseñas encriptadas con bcrypt
   - Máxima seguridad

### 4. Características del Sistema de Login

- 🔒 **Autenticación segura** con contraseñas encriptadas usando bcrypt
- ⏰ **Sesiones de 24 horas** - después expiran automáticamente
- 💾 **Persistencia local** - mantiene la sesión al recargar la página
- 🚪 **Logout seguro** - limpia toda la información de sesión
- 📱 **Responsive** - funciona en móviles y escritorio
- 👁️ **Mostrar/ocultar contraseña** - para mejor UX

### 5. Flujo de la Aplicación

1. **Sin autenticar**: Muestra formulario de login
2. **Autenticando**: Muestra spinner de carga
3. **Autenticado**: Muestra dashboard completo con:
   - Información del usuario en sidebar
   - Botón de cerrar sesión
   - Acceso a todas las funcionalidades

### 6. Seguridad Implementada

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Row Level Security (RLS) habilitado
- ✅ Funciones de base de datos con SECURITY DEFINER
- ✅ Validación de sesiones con expiración
- ✅ Limpieza automática de sesiones expiradas

### 7. Agregar Más Usuarios (Opcional)

Para agregar más usuarios, ejecuta en Supabase:

```sql
INSERT INTO users (username, password_hash) 
VALUES (
  'nuevo_usuario', 
  crypt('nueva_contraseña', gen_salt('bf'))
);
```

---

## 🚀 ¡Listo para Usar!

Una vez ejecutado el script SQL, la aplicación estará completamente protegida con autenticación. Solo los usuarios autenticados podrán acceder al sistema de gestión del estudio.

**Nota**: Asegúrate de cambiar las credenciales por defecto en un entorno de producción.