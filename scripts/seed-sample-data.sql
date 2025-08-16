-- ============================================
-- Datos de ejemplo para Lucero Glam Studio
-- ============================================

-- Insertar servicios de ejemplo
INSERT INTO public.services (name, description, price, duration_minutes) VALUES
('Corte de Cabello', 'Corte profesional con lavado y peinado', 25.00, 45),
('Tinte Completo', 'Coloración completa del cabello', 60.00, 120),
('Manicure', 'Cuidado completo de uñas de manos', 15.00, 30),
('Pedicure', 'Cuidado completo de uñas de pies', 20.00, 45),
('Tratamiento Capilar', 'Hidratación profunda del cabello', 35.00, 60),
('Maquillaje Social', 'Maquillaje para eventos especiales', 40.00, 60),
('Depilación Cejas', 'Perfilado y depilación de cejas', 12.00, 20),
('Brushing', 'Peinado con secador y cepillo', 18.00, 30)
ON CONFLICT (name) DO NOTHING;

-- Insertar clientes de ejemplo
INSERT INTO public.clients (first_name, last_name, phone_number, description) VALUES
('María', 'González', '+1234567890', 'Cliente frecuente, prefiere citas por la mañana'),
('Ana', 'Rodríguez', '+1234567891', 'Alérgica a ciertos tintes, usar productos hipoalergénicos'),
('Carmen', 'López', '+1234567892', 'Le gusta probar nuevos estilos'),
('Isabel', 'Martín', '+1234567893', 'Cliente VIP, siempre puntual'),
('Laura', 'Sánchez', '+1234567894', 'Prefiere servicios de uñas'),
('Patricia', 'Jiménez', '+1234567895', 'Cliente nueva, muy amable'),
('Rosa', 'Ruiz', '+1234567896', 'Viene cada 15 días para manicure'),
('Elena', 'Moreno', '+1234567897', 'Le encanta el color rubio')
ON CONFLICT (phone_number) DO NOTHING;

-- Insertar algunas citas de ejemplo (próximas fechas)
INSERT INTO public.appointments (client_id, service_id, appointment_date, deposit_amount, notes, status) VALUES
(1, 1, '2025-01-20 10:00:00+00', 10.00, 'Corte bob como siempre', 'scheduled'),
(2, 2, '2025-01-20 14:00:00+00', 20.00, 'Tinte castaño claro', 'scheduled'),
(3, 6, '2025-01-21 16:00:00+00', 15.00, 'Maquillaje para boda', 'scheduled'),
(4, 3, '2025-01-22 11:00:00+00', 5.00, 'Manicure francesa', 'scheduled'),
(5, 4, '2025-01-22 15:00:00+00', 8.00, 'Pedicure con esmalte rojo', 'scheduled'),
(1, 5, '2025-01-15 10:00:00+00', 15.00, 'Tratamiento hidratante', 'completed'),
(2, 1, '2025-01-10 14:00:00+00', 10.00, 'Corte y peinado', 'completed'),
(3, 3, '2025-01-12 16:00:00+00', 5.00, 'Manicure regular', 'completed');
