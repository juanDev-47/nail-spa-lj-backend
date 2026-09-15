-- Corrige las citas creadas cuando la hora de agenda de Bogotá se persistía erróneamente como UTC.
UPDATE citas
SET
  fecha_hora_inicio = fecha_hora_inicio + INTERVAL '5 hours',
  fecha_hora_fin = fecha_hora_fin + INTERVAL '5 hours';