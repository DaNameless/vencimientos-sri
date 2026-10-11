SET NAMES utf8mb4;
-- Esquema relacional: clientes, tipos de obligación, obligaciones y bitácora.
-- Compatible con MySQL 8 (y MariaDB 10.6+).

DROP TABLE IF EXISTS bitacora;
DROP TABLE IF EXISTS obligaciones;
DROP TABLE IF EXISTS tipos_obligacion;
DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ruc           CHAR(13)     NOT NULL,
    razon_social  VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NULL,
    creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_clientes_ruc UNIQUE (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipos_obligacion (
    id            TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo        VARCHAR(20)  NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    CONSTRAINT uq_tipos_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE obligaciones (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id         INT UNSIGNED     NOT NULL,
    tipo_id            TINYINT UNSIGNED NOT NULL,
    periodo            CHAR(7)          NOT NULL,          -- 'YYYY-MM'
    fecha_vencimiento  DATE             NOT NULL,
    estado             ENUM('pendiente', 'presentada') NOT NULL DEFAULT 'pendiente',
    presentada_en      DATETIME         NULL,
    CONSTRAINT fk_oblig_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    CONSTRAINT fk_oblig_tipo    FOREIGN KEY (tipo_id)    REFERENCES tipos_obligacion(id),
    -- Una sola obligación por cliente, tipo y período (evita duplicados al regenerar).
    CONSTRAINT uq_oblig UNIQUE (cliente_id, tipo_id, periodo),
    -- Índice para las consultas más frecuentes: "pendientes ordenadas por vencimiento".
    INDEX idx_oblig_estado_venc (estado, fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bitacora (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    obligacion_id  INT UNSIGNED NOT NULL,
    accion         VARCHAR(30)  NOT NULL,
    detalle        VARCHAR(255) NULL,
    creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bitacora_oblig FOREIGN KEY (obligacion_id) REFERENCES obligaciones(id) ON DELETE CASCADE,
    INDEX idx_bitacora_oblig (obligacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
