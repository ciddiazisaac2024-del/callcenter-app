import { query } from './database';
import { logger } from './logger';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  logger.info('🌱 Iniciando seed...');

  const adminHash = await bcrypt.hash('Admin123!', 12);
  const agentHash = await bcrypt.hash('Agent123!', 12);

  await query(`
    INSERT INTO users (email, password_hash, name, role) VALUES
      ('admin@callcenter.cl',      $1, 'Carlos Rodríguez', 'admin'),
      ('supervisor@callcenter.cl', $2, 'Ana Torres',        'supervisor'),
      ('agente1@callcenter.cl',    $3, 'Felipe Muñoz',      'agent'),
      ('agente2@callcenter.cl',    $4, 'Valentina López',   'agent')
    ON CONFLICT (email) DO NOTHING
  `, [adminHash, agentHash, agentHash, agentHash]);

  logger.info('Usuarios creados');

  const cats = await query('SELECT id, name FROM script_categories');
  const catMap: Record<string, string> = {};
  cats.rows.forEach((c: { id: string; name: string }) => { catMap[c.name] = c.id; });

  const adminRes = await query(`SELECT id FROM users WHERE email = 'admin@callcenter.cl'`);
  const adminId  = adminRes.rows[0].id;

  const scripts = [
    {
      title: 'Gestión de Incumplimiento de Pago',
      category: 'Soporte Técnico',
      description: 'Script para contactar clientes con cuotas vencidas. Tono firme pero empático.',
      tags: ['incumplimiento', 'cobranza', 'pago'],
      variables: [
        { key: 'cliente',      label: 'Nombre del cliente',   type: 'text',   placeholder: 'Ej: Sr. García' },
        { key: 'monto',        label: 'Monto adeudado',       type: 'text',   placeholder: 'Ej: $45.000' },
        { key: 'cuotas',       label: 'Nº cuotas vencidas',   type: 'number', placeholder: 'Ej: 2' },
        { key: 'producto',     label: 'Producto contratado',  type: 'select', options: ['Seguro de Vida', 'Seguro de Salud', 'Seguro de Auto', 'Plan Ahorro'] },
        { key: 'fecha_limite', label: 'Fecha límite de pago', type: 'text',   placeholder: 'Ej: 15 de enero' },
      ],
      content: `Buenos días/tardes, ¿me comunico con {{cliente}}?

**Apertura**
Mi nombre es [AGENTE] y le llamo del área de Gestión de Clientes. Le contactamos porque su {{producto}} presenta {{cuotas}} cuota(s) vencida(s) por un total de {{monto}}.

**Verificación**
¿Podría confirmarme su RUT para validar su identidad?

**Presentación del problema**
El pago de su {{producto}} no ha sido procesado. Esto podría significar la suspensión de su cobertura en los próximos días.

**Propuesta de solución**
Queremos ayudarle a regularizar su situación antes del {{fecha_limite}}:

→ Pago inmediato vía transferencia o tarjeta
→ Coordinación de fecha de pago hasta en 5 días hábiles
→ Revisión de plan si hay dificultades financieras

¿Cuál de estas opciones le acomoda mejor?`
    },
    {
      title: 'Encuesta de Calidad Post-Llamada',
      category: 'Bienvenida',
      description: 'Script para encuesta NPS y CSAT. Clave para métricas de satisfacción.',
      tags: ['calidad', 'NPS', 'encuesta', 'satisfaccion'],
      variables: [
        { key: 'cliente',         label: 'Nombre del cliente',        type: 'text',   placeholder: 'Ej: Sra. Martínez' },
        { key: 'motivo_llamada',  label: 'Motivo de llamada anterior', type: 'select', options: ['consulta de póliza', 'reporte de siniestro', 'actualización de datos', 'pago de cuota', 'cancelación'] },
        { key: 'agente_anterior', label: 'Agente que atendió',        type: 'text',   placeholder: 'Ej: Pedro Soto' },
      ],
      content: `Buenas, ¿me comunico con {{cliente}}?

**Presentación**
Mi nombre es [AGENTE], le llamo del área de Calidad. Le contactamos por su gestión de {{motivo_llamada}} atendida por {{agente_anterior}}.

---

**Pregunta 1 — Satisfacción general**
Del 1 al 10, ¿qué calificación le daría a la atención recibida?
*(Registrar: ______)*

**Pregunta 2 — Resolución**
¿Su consulta fue resuelta completamente?
□ Sí   □ Parcialmente   □ No

**Pregunta 3 — NPS**
¿Qué tan probable es que recomiende nuestros servicios del 0 al 10?
*(Registrar: ______)*

---

Muchas gracias {{cliente}} por su tiempo. ¡Que tenga un excelente día!`
    },
    {
      title: 'Afiliación CNE — Primer Contacto',
      category: 'Ventas',
      description: 'Script de captación para nuevos afiliados CNE. Incluye beneficios y cierre.',
      tags: ['CNE', 'afiliacion', 'ventas', 'beneficios'],
      variables: [
        { key: 'cliente',           label: 'Nombre del prospecto',   type: 'text',   placeholder: 'Ej: Don Roberto' },
        { key: 'empresa',           label: 'Empresa donde trabaja',  type: 'text',   placeholder: 'Ej: Falabella' },
        { key: 'cargo',             label: 'Cargo',                  type: 'select', options: ['Empleado', 'Jefe de área', 'Supervisor', 'Gerente'] },
        { key: 'beneficio_interes', label: 'Beneficio de interés',   type: 'select', options: ['Seguro de vida', 'Crédito de consumo', 'Fondo de cesantía', 'Seguro de salud complementario'] },
        { key: 'renta',             label: 'Rango de renta mensual', type: 'select', options: ['Menos de $500.000', '$500.000 a $800.000', '$800.000 a $1.200.000', 'Más de $1.200.000'] },
      ],
      content: `Buenos días/tardes, ¿podría comunicarme con {{cliente}}?

**Presentación**
Hola {{cliente}}, soy [AGENTE] de la CNE — Caja Nacional de Empleados. ¿Tiene dos minutos?

**Gancho**
Trabajadores de {{empresa}} como usted están accediendo a beneficios exclusivos que muchos desconocen — sin costo adicional en su sueldo.

Su cargo como {{cargo}} lo califica para acceder de inmediato.

---

**Beneficios disponibles**
✓ {{beneficio_interes}} — nuestro beneficio más valorado
✓ Créditos con cuotas descontadas directo de su sueldo
✓ Convenios con farmacias y clínicas (hasta 40% descuento)

Con una renta de {{renta}}, califica para créditos de hasta 10 veces su sueldo.

---

¿Le parece si coordinamos 15 minutos esta semana para mostrarle {{beneficio_interes}} en detalle?`
    },
    {
      title: 'Retención — Solicitud de Baja',
      category: 'Retención',
      description: 'Script para retener clientes que llaman a cancelar. Objetivo: 60% retención.',
      tags: ['retencion', 'baja', 'cancelacion', 'churn'],
      variables: [
        { key: 'cliente',         label: 'Nombre del cliente',  type: 'text',   placeholder: 'Ej: Sra. Fernández' },
        { key: 'producto',        label: 'Producto a cancelar', type: 'select', options: ['Seguro de Vida', 'Seguro de Salud', 'Seguro de Auto', 'Plan Ahorro'] },
        { key: 'tiempo_contrato', label: 'Tiempo como cliente', type: 'text',   placeholder: 'Ej: 3 años' },
        { key: 'motivo_baja',     label: 'Motivo de baja',      type: 'select', options: ['Precio alto', 'No usa el producto', 'Contrató con la competencia', 'Problemas económicos', 'Mala experiencia'] },
        { key: 'oferta',          label: 'Oferta de retención', type: 'select', options: ['3 meses sin costo', 'Descuento 30% por 6 meses', 'Upgrade de plan sin costo', 'Plan alternativo más económico'] },
      ],
      content: `**Validación inicial**
{{cliente}}, entiendo que desea cancelar su {{producto}}. Antes de procesar, ¿me permite hacerle un par de preguntas?

Veo que lleva {{tiempo_contrato}} con nosotros. Motivo registrado: {{motivo_baja}}.

Quiero ofrecerle algo especial: **{{oferta}}**.

**Al cancelar su {{producto}} perdería:**
→ La antigüedad de {{tiempo_contrato}} que no puede recuperarse
→ Su cobertura inmediata ante cualquier eventualidad
→ Las condiciones preferenciales por permanencia

**Propuesta**
¿Activamos {{oferta}} hoy mismo para que no pierda ningún beneficio?

*(Si acepta)* Excelente {{cliente}}. Proceso {{oferta}} ahora. ¿Confirmo su RUT?
*(Si no acepta)* Entiendo. Le envío la oferta por correo — vigente 48 horas.`
    },
    {
      title: 'Cierre de Venta — Seguro de Vida',
      category: 'Ventas',
      description: 'Script de cierre para prospecto calificado. Requiere todos los datos del cliente.',
      tags: ['ventas', 'cierre', 'seguro-vida', 'conversion'],
      variables: [
        { key: 'cliente',      label: 'Nombre completo',        type: 'text',   placeholder: 'Ej: Juan Carlos Pérez' },
        { key: 'plan',         label: 'Plan elegido',           type: 'select', options: ['Plan Básico $9.990/mes', 'Plan Familia $18.990/mes', 'Plan Premium $29.990/mes'] },
        { key: 'beneficiario', label: 'Beneficiario principal', type: 'text',   placeholder: 'Ej: María Pérez (cónyuge)' },
        { key: 'fecha_inicio', label: 'Fecha inicio cobertura', type: 'text',   placeholder: 'Ej: 1 de febrero 2025' },
        { key: 'forma_pago',   label: 'Forma de pago',          type: 'select', options: ['Débito automático', 'Cargo a tarjeta de crédito', 'Descuento por planilla', 'PAC Banco Estado'] },
      ],
      content: `**Resumen de lo acordado**
{{cliente}}, permítame confirmar:

→ Plan contratado: {{plan}}
→ Beneficiario: {{beneficiario}}
→ Inicio de cobertura: {{fecha_inicio}}
→ Forma de pago: {{forma_pago}}

¿Todo correcto?

---

**Condiciones importantes**
1. El seguro entra en vigencia el {{fecha_inicio}}
2. Tiene 10 días hábiles de retracto sin costo
3. Recibirá la póliza en su correo en 5 días hábiles

¿Está de acuerdo con estas condiciones?

---

Perfecto {{cliente}}. Su **{{plan}}** ha quedado contratado exitosamente.
Recibirá un SMS de confirmación en los próximos minutos.

¡Bienvenido! [REGISTRAR EN CRM: Venta exitosa — {{cliente}} — {{plan}}]`
    },
    {
      title: 'Llamada de Bienvenida — Nuevo Cliente',
      category: 'Bienvenida',
      description: 'Primer contacto post-venta para activar la relación y confirmar datos.',
      tags: ['bienvenida', 'onboarding', 'nuevo-cliente'],
      variables: [
        { key: 'cliente',            label: 'Nombre del cliente',       type: 'text',   placeholder: 'Ej: Andrea Soto' },
        { key: 'producto',           label: 'Producto contratado',      type: 'select', options: ['Seguro de Vida', 'Seguro de Salud', 'Seguro de Auto', 'Plan Ahorro', 'CNE Afiliación'] },
        { key: 'fecha_contratacion', label: 'Fecha de contratación',    type: 'text',   placeholder: 'Ej: 10 de enero' },
        { key: 'agente_venta',       label: 'Agente que hizo la venta', type: 'text',   placeholder: 'Ej: Carlos Vega' },
      ],
      content: `Buenos días/tardes, ¿podría comunicarme con {{cliente}}?

**Presentación**
Hola {{cliente}}, soy [AGENTE] del equipo de Bienvenida. El {{fecha_contratacion}} contrató su {{producto}} con {{agente_venta}}, ¡y quería darle personalmente la bienvenida!

**Verificación rápida**
¿Su correo y datos de pago quedaron correctamente registrados?

---

**Su {{producto}} ya está 100% activo. Usted tiene:**
✓ Cobertura completa desde hoy
✓ Acceso a nuestra app móvil 24/7
✓ Línea exclusiva de clientes: 600-XXX-XXXX

**Próximos pasos:**
1. Guardar nuestro número en sus contactos
2. Descargar la app
3. Revisar el correo con su póliza

---

¿Tiene alguna duda sobre su {{producto}}?

¡Bienvenido a la familia {{cliente}}!`
    },
  ];

  for (const s of scripts) {
    const catId = catMap[s.category];
    await query(
      `INSERT INTO scripts (title, category_id, description, base_content, variables, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [s.title, catId, s.description, s.content,
       JSON.stringify(s.variables), s.tags, adminId]
    );
  }

  logger.info({ count: scripts.length }, 'Scripts insertados');
  
  
  
  
  
  logger.info('Seed completado. Credenciales: admin@callcenter.cl/Admin123! | agente1@callcenter.cl/Agent123!');
  process.exit(0);
}

seed().catch(err => {
  logger.error({ err }, 'Error en seed');
  process.exit(1);
});
