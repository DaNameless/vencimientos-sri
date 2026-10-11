SET NAMES utf8mb4;
-- Datos de ejemplo. Los RUC y razones sociales son ficticios.

INSERT INTO tipos_obligacion (codigo, nombre) VALUES
    ('IVA',  'Declaración mensual de IVA'),
    ('RET',  'Retenciones en la fuente del Impuesto a la Renta');

-- El noveno dígito del RUC (posición 9) determina el día de vencimiento.
INSERT INTO clientes (ruc, razon_social, email) VALUES
    ('1799999910001', 'Comercial Andina Demo S.A.',      'contabilidad@andina.example'),
    ('1799999930001', 'Tostadora Cotopaxi Demo Cía. Ltda.', 'finanzas@cotopaxi.example'),
    ('0999999950001', 'Importadora Guayas Demo S.A.',     'impuestos@guayas.example'),
    ('0199999970001', 'Textiles Cuenca Demo S.A.',        NULL),
    ('1799999900001', 'Servicios Pichincha Demo S.A.S.',  'admin@pichincha.example');
