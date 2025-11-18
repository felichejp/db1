-- =====================================================
-- Script SQL para Sistema de Asesorías entre Pares
-- Base de datos: PostgreSQL
-- =====================================================

-- Eliminar tablas existentes (en orden inverso de dependencias)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS group_invitations CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS tutor_availability CASCADE;
DROP TABLE IF EXISTS tutor_subjects CASCADE;
DROP TABLE IF EXISTS tutors CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
--DROP TABLE IF EXISTS users CASCADE;

-- Eliminar funciones y triggers existentes
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS validate_group_members() CASCADE;
DROP FUNCTION IF EXISTS update_tutor_rating() CASCADE;
DROP FUNCTION IF EXISTS update_tutor_session_count() CASCADE;
DROP FUNCTION IF EXISTS check_tutor_availability() CASCADE;
DROP FUNCTION IF EXISTS expire_old_invitations() CASCADE;

-- =====================================================
-- CREACIÓN DE TABLAS
-- =====================================================

-- Tabla: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Profesor', 'Tutor', 'Estudiante')),
    grado INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Tabla: groups
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    "profesorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'completado')),
    descripcion TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para groups
CREATE INDEX idx_groups_profesor ON groups("profesorId");
CREATE INDEX idx_groups_estado ON groups(estado);

-- Tabla: group_members
CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("groupId", "userId")
);

-- Índices para group_members
CREATE INDEX idx_group_members_group ON group_members("groupId");
CREATE INDEX idx_group_members_user ON group_members("userId");

-- Tabla: tutors
CREATE TABLE tutors (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "ratingPromedio" DECIMAL(3,2) DEFAULT 0.00 CHECK ("ratingPromedio" >= 0 AND "ratingPromedio" <= 5),
    "totalSesiones" INTEGER DEFAULT 0,
    "totalEvaluaciones" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para tutors
CREATE INDEX idx_tutors_user ON tutors("userId");
CREATE INDEX idx_tutors_rating ON tutors("ratingPromedio");

-- Tabla: tutor_subjects
CREATE TABLE tutor_subjects (
    id SERIAL PRIMARY KEY,
    "tutorId" INTEGER REFERENCES tutors(id) ON DELETE CASCADE NOT NULL,
    materia VARCHAR(100) NOT NULL,
    nivel VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("tutorId", materia)
);

-- Índices para tutor_subjects
CREATE INDEX idx_tutor_subjects_tutor ON tutor_subjects("tutorId");
CREATE INDEX idx_tutor_subjects_materia ON tutor_subjects(materia);

-- Tabla: tutor_availability
CREATE TABLE tutor_availability (
    id SERIAL PRIMARY KEY,
    "tutorId" INTEGER REFERENCES tutors(id) ON DELETE CASCADE NOT NULL,
    "diaSemana" INTEGER NOT NULL CHECK ("diaSemana" >= 0 AND "diaSemana" <= 6), -- 0=Domingo, 6=Sábado
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,
    activo BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ("horaFin" > "horaInicio")
);

-- Índices para tutor_availability
CREATE INDEX idx_tutor_availability_tutor ON tutor_availability("tutorId");
CREATE INDEX idx_tutor_availability_dia ON tutor_availability("diaSemana");

-- Tabla: sessions
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    "tutorId" INTEGER REFERENCES tutors(id) ON DELETE SET NULL,
    "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL,
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en_curso', 'completada', 'cancelada')),
    tema VARCHAR(255),
    notas TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ("horaFin" > "horaInicio")
);

-- Índices para sessions
CREATE INDEX idx_sessions_tutor ON sessions("tutorId");
CREATE INDEX idx_sessions_group ON sessions("groupId");
CREATE INDEX idx_sessions_fecha ON sessions(fecha);
CREATE INDEX idx_sessions_estado ON sessions(estado);

-- Tabla: evaluations
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    "sessionId" INTEGER REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    "evaluatorId" INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    "tutorId" INTEGER REFERENCES tutors(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comentario TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("sessionId", "evaluatorId")
);

-- Índices para evaluations
CREATE INDEX idx_evaluations_session ON evaluations("sessionId");
CREATE INDEX idx_evaluations_tutor ON evaluations("tutorId");
CREATE INDEX idx_evaluations_evaluator ON evaluations("evaluatorId");

-- Tabla: messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    "senderId" INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'archivo', 'sistema')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para messages
CREATE INDEX idx_messages_group ON messages("groupId");
CREATE INDEX idx_messages_sender ON messages("senderId");
CREATE INDEX idx_messages_created ON messages("createdAt");

-- Tabla: files
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    "uploaderId" INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    "s3Key" VARCHAR(500) NOT NULL,
    tipo VARCHAR(100),
    tamaño INTEGER NOT NULL CHECK (tamaño <= 10485760), -- 10 MB en bytes
    descripcion TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para files
CREATE INDEX idx_files_group ON files("groupId");
CREATE INDEX idx_files_uploader ON files("uploaderId");

-- Tabla: group_invitations
CREATE TABLE group_invitations (
    id SERIAL PRIMARY KEY,
    "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    "invitedUserId" INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    "inviterId" INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada')),
    "expiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para group_invitations
CREATE INDEX idx_group_invitations_group ON group_invitations("groupId");
CREATE INDEX idx_group_invitations_invited ON group_invitations("invitedUserId");
CREATE INDEX idx_group_invitations_estado ON group_invitations(estado);
CREATE INDEX idx_group_invitations_expires ON group_invitations("expiresAt");

-- Tabla: badges
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(255),
    criterio TEXT, -- Descripción de cómo obtener el badge
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_badges
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    "badgeId" INTEGER REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
    "earnedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "badgeId")
);

-- Índices para user_badges
CREATE INDEX idx_user_badges_user ON user_badges("userId");
CREATE INDEX idx_user_badges_badge ON user_badges("badgeId");

-- Tabla: notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'sesion_programada', 'invitacion_grupo', 'mensaje_nuevo', 'evaluacion_pendiente', etc.
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT false,
    "relacionId" INTEGER, -- ID de la entidad relacionada (sessionId, groupId, etc.)
    "relacionTipo" VARCHAR(50), -- Tipo de entidad relacionada
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para notifications
CREATE INDEX idx_notifications_user ON notifications("userId");
CREATE INDEX idx_notifications_leida ON notifications(leida);
CREATE INDEX idx_notifications_created ON notifications("createdAt");

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para actualizar automáticamente updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para validar límite de miembros en grupos (mínimo 1, máximo 5)
CREATE OR REPLACE FUNCTION validate_group_members()
RETURNS TRIGGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    -- Contar miembros actuales del grupo
    SELECT COUNT(*) INTO member_count
    FROM group_members
    WHERE "groupId" = NEW."groupId";
    
    -- Si es una inserción, el count incluirá el nuevo miembro
    IF TG_OP = 'INSERT' THEN
        member_count := member_count + 1;
    END IF;
    
    -- Validar máximo de 5 miembros
    IF member_count > 5 THEN
        RAISE EXCEPTION 'Un grupo no puede tener más de 5 miembros. Actual: %', member_count;
    END IF;
    
    -- Validar mínimo de 1 miembro (solo al eliminar)
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO member_count
        FROM group_members
        WHERE "groupId" = OLD."groupId";
        
        IF member_count < 1 THEN
            RAISE EXCEPTION 'Un grupo debe tener al menos 1 miembro';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar ratingPromedio en tutors cuando se crea/actualiza/elimina una evaluación
CREATE OR REPLACE FUNCTION update_tutor_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_evals INTEGER;
BEGIN
    -- Determinar el tutorId según la operación
    DECLARE
        tutor_id INTEGER;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            tutor_id := OLD."tutorId";
        ELSE
            tutor_id := NEW."tutorId";
        END IF;
        
        -- Calcular promedio y total de evaluaciones
        SELECT 
            COALESCE(AVG(rating)::DECIMAL(3,2), 0.00),
            COUNT(*)
        INTO avg_rating, total_evals
        FROM evaluations
        WHERE "tutorId" = tutor_id;
        
        -- Actualizar la tabla tutors
        UPDATE tutors
        SET 
            "ratingPromedio" = avg_rating,
            "totalEvaluaciones" = total_evals,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = tutor_id;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar totalSesiones en tutors
CREATE OR REPLACE FUNCTION update_tutor_session_count()
RETURNS TRIGGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Determinar el tutorId según la operación
    DECLARE
        tutor_id INTEGER;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            tutor_id := OLD."tutorId";
        ELSIF TG_OP = 'UPDATE' THEN
            -- Si cambió el tutorId, actualizar ambos
            IF OLD."tutorId" IS DISTINCT FROM NEW."tutorId" THEN
                -- Actualizar tutor anterior
                IF OLD."tutorId" IS NOT NULL THEN
                    SELECT COUNT(*) INTO session_count
                    FROM sessions
                    WHERE "tutorId" = OLD."tutorId" AND estado != 'cancelada';
                    
                    UPDATE tutors
                    SET "totalSesiones" = session_count, "updatedAt" = CURRENT_TIMESTAMP
                    WHERE id = OLD."tutorId";
                END IF;
                
                -- Actualizar nuevo tutor
                IF NEW."tutorId" IS NOT NULL THEN
                    SELECT COUNT(*) INTO session_count
                    FROM sessions
                    WHERE "tutorId" = NEW."tutorId" AND estado != 'cancelada';
                    
                    UPDATE tutors
                    SET "totalSesiones" = session_count, "updatedAt" = CURRENT_TIMESTAMP
                    WHERE id = NEW."tutorId";
                END IF;
                
                RETURN NEW;
            END IF;
            tutor_id := NEW."tutorId";
        ELSE
            tutor_id := NEW."tutorId";
        END IF;
        
        -- Solo contar sesiones no canceladas
        SELECT COUNT(*) INTO session_count
        FROM sessions
        WHERE "tutorId" = tutor_id AND estado != 'cancelada';
        
        -- Actualizar la tabla tutors
        UPDATE tutors
        SET 
            "totalSesiones" = session_count,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = tutor_id;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de tutores
-- Retorna true si el tutor está disponible en la fecha y hora especificadas
CREATE OR REPLACE FUNCTION check_tutor_availability(
    p_tutor_id INTEGER,
    p_fecha DATE,
    p_hora_inicio TIME,
    p_hora_fin TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    dia_semana INTEGER;
    tiene_disponibilidad BOOLEAN;
    tiene_conflicto BOOLEAN;
BEGIN
    -- Obtener día de la semana (0=Domingo, 6=Sábado)
    dia_semana := EXTRACT(DOW FROM p_fecha);
    
    -- Verificar si tiene disponibilidad configurada para ese día
    SELECT EXISTS(
        SELECT 1
        FROM tutor_availability
        WHERE "tutorId" = p_tutor_id
        AND "diaSemana" = dia_semana
        AND activo = true
        AND "horaInicio" <= p_hora_inicio
        AND "horaFin" >= p_hora_fin
    ) INTO tiene_disponibilidad;
    
    IF NOT tiene_disponibilidad THEN
        RETURN false;
    END IF;
    
    -- Verificar si hay conflicto con sesiones existentes
    SELECT EXISTS(
        SELECT 1
        FROM sessions
        WHERE "tutorId" = p_tutor_id
        AND fecha = p_fecha
        AND estado != 'cancelada'
        AND (
            ("horaInicio" <= p_hora_inicio AND "horaFin" > p_hora_inicio) OR
            ("horaInicio" < p_hora_fin AND "horaFin" >= p_hora_fin) OR
            ("horaInicio" >= p_hora_inicio AND "horaFin" <= p_hora_fin)
        )
    ) INTO tiene_conflicto;
    
    RETURN NOT tiene_conflicto;
END;
$$ LANGUAGE plpgsql;

-- Función para expirar invitaciones antiguas
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE group_invitations
    SET estado = 'expirada', "updatedAt" = CURRENT_TIMESTAMP
    WHERE estado = 'pendiente'
    AND "expiresAt" IS NOT NULL
    AND "expiresAt" < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updatedAt en users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updatedAt en groups
CREATE TRIGGER trigger_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updatedAt en tutors
CREATE TRIGGER trigger_tutors_updated_at
    BEFORE UPDATE ON tutors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updatedAt en sessions
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updatedAt en group_invitations
CREATE TRIGGER trigger_group_invitations_updated_at
    BEFORE UPDATE ON group_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validar límite de miembros al insertar
CREATE TRIGGER trigger_validate_group_members_insert
    BEFORE INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_group_members();

-- Trigger para validar límite de miembros al eliminar
CREATE TRIGGER trigger_validate_group_members_delete
    BEFORE DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_group_members();

-- Trigger para actualizar ratingPromedio cuando se inserta una evaluación
CREATE TRIGGER trigger_update_tutor_rating_insert
    AFTER INSERT ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_tutor_rating();

-- Trigger para actualizar ratingPromedio cuando se actualiza una evaluación
CREATE TRIGGER trigger_update_tutor_rating_update
    AFTER UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_tutor_rating();

-- Trigger para actualizar ratingPromedio cuando se elimina una evaluación
CREATE TRIGGER trigger_update_tutor_rating_delete
    AFTER DELETE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_tutor_rating();

-- Trigger para actualizar totalSesiones cuando se inserta una sesión
CREATE TRIGGER trigger_update_tutor_session_count_insert
    AFTER INSERT ON sessions
    FOR EACH ROW
    WHEN (NEW."tutorId" IS NOT NULL)
    EXECUTE FUNCTION update_tutor_session_count();

-- Trigger para actualizar totalSesiones cuando se actualiza una sesión
CREATE TRIGGER trigger_update_tutor_session_count_update
    AFTER UPDATE ON sessions
    FOR EACH ROW
    WHEN (NEW."tutorId" IS NOT NULL OR OLD."tutorId" IS NOT NULL)
    EXECUTE FUNCTION update_tutor_session_count();

-- Trigger para actualizar totalSesiones cuando se elimina una sesión
CREATE TRIGGER trigger_update_tutor_session_count_delete
    AFTER DELETE ON sessions
    FOR EACH ROW
    WHEN (OLD."tutorId" IS NOT NULL)
    EXECUTE FUNCTION update_tutor_session_count();

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar algunos badges de ejemplo
INSERT INTO badges (nombre, descripcion, criterio) VALUES
('Primera Sesión', 'Completó su primera sesión de asesoría', 'Completar al menos 1 sesión'),
('Tutor Estrella', 'Tutor con rating promedio superior a 4.5', 'Tener rating promedio >= 4.5 con mínimo 5 evaluaciones'),
('Experto', 'Tutor con más de 20 sesiones completadas', 'Completar al menos 20 sesiones'),
('Ayudante', 'Tutor con más de 10 sesiones completadas', 'Completar al menos 10 sesiones'),
('Comprometido', 'Tutor con más de 5 sesiones completadas', 'Completar al menos 5 sesiones');

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE users IS 'Usuarios del sistema: Admin, Profesor, Tutor, Estudiante';
COMMENT ON TABLE groups IS 'Grupos de estudiantes (mínimo 1, máximo 5 miembros)';
COMMENT ON TABLE group_members IS 'Relación muchos-a-muchos entre grupos y usuarios';
COMMENT ON TABLE tutors IS 'Información específica de tutores con métricas';
COMMENT ON TABLE tutor_subjects IS 'Materias de especialidad de cada tutor';
COMMENT ON TABLE tutor_availability IS 'Disponibilidad semanal de tutores';
COMMENT ON TABLE sessions IS 'Sesiones de asesoría programadas y realizadas';
COMMENT ON TABLE evaluations IS 'Evaluaciones de sesiones por estudiantes y profesores';
COMMENT ON TABLE messages IS 'Mensajes en grupos (chat/foro)';
COMMENT ON TABLE files IS 'Archivos compartidos en grupos (almacenados en S3)';
COMMENT ON TABLE group_invitations IS 'Invitaciones a grupos con expiración';
COMMENT ON TABLE badges IS 'Badges disponibles en el sistema';
COMMENT ON TABLE user_badges IS 'Badges ganados por usuarios';
COMMENT ON TABLE notifications IS 'Notificaciones para usuarios';

COMMENT ON FUNCTION check_tutor_availability IS 'Verifica si un tutor está disponible en una fecha y hora específicas';
COMMENT ON FUNCTION expire_old_invitations IS 'Marca como expiradas las invitaciones que han pasado su fecha de expiración';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

