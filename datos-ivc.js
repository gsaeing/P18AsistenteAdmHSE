/**
 * Respuestas a los instructivos y a la foto de la carpeta 1-31.
 * Explicación simple: aquí está la guía fácil de cada papel que pide la Secretaría de Salud.
 * Si usted tiene un restaurante, barbería, fábrica o tienda, aquí sabe qué le van a revisar.
 */

/** Explicación simple: las 25 carpetas de la foto, qué son y cada cuánto se vencen. */
export const CARPETAS_31 = [
  { n: 1, nombre: "Cámara de Comercio", paraQue: "Demuestra que su negocio existe legalmente.", vence: "Cada año antes del 31 de marzo", ley: "Código Comercio + Ley 1801/2016 art.87" },
  { n: 2, nombre: "RUT / DIAN / RIT", paraQue: "Número de impuestos nacional (RUT-DIAN) y de Bogotá (RIT-ICA).", vence: "Vigente; actualice si cambia dirección o actividad", ley: "Estatuto Tributario + acuerdos ICA" },
  { n: 3, nombre: "Sayco-Acinpro + Uso de Suelo", paraQue: "Permiso para poner música + permiso de dónde puede funcionar.", vence: "Sayco anual; Uso de suelo vigente si no cambia", ley: "Ley 23/1982 + Ley 1801/2016 POT" },
  { n: 4, nombre: "Bomberos (concepto técnico)", paraQue: "Revisan extintores, salidas y riesgo de incendio.", vence: "Cada año", ley: "Ley 1575/2012" },
  { n: 5, nombre: "Concepto Sanitario", paraQue: "Nota que pone Salud: Favorable o con exigencias.", vence: "Cada visita; pida renovación anual", ley: "Ley 9/1979 + Res. 1229/2013" },
  { n: 6, nombre: "Apertura establecimiento / Ley 1801", paraQue: "Cumplir los 4 requisitos para abrir al público.", vence: "Permanente", ley: "Ley 1801/2016 art.87" },
  { n: 7, nombre: "Procedimiento Limpieza y Desinfección", paraQue: "Papel que dice cómo y cuándo limpia todo.", vence: "Revisar cada año", ley: "Res. 2674/2013 + Ley 9/1979" },
  { n: 8, nombre: "Procedimiento Manejo Residuos sólidos y líquidos", paraQue: "Cómo separa la basura y el aceite usado.", vence: "Revisar cada año", ley: "Ley 9/1979 + Res. 1164/2002" },
  { n: 9, nombre: "Procedimiento Manejo de Plagas", paraQue: "Cómo evita ratones y cucarachas.", vence: "Revisar cada año", ley: "Decreto 1843/1991" },
  { n: 10, nombre: "Procedimiento Calidad Agua Potable", paraQue: "Cómo cuida el tanque y el agua que toma la gente.", vence: "Lavar tanque cada 6 meses", ley: "Decreto 1575/2007 + Res. 2115/2007" },
  { n: 11, nombre: "Programa Capacitación BPM y Alimentos", paraQue: "Clases del año para quienes tocan comida.", vence: "Plan anual", ley: "Res. 2674/2013 art.13" },
  { n: 12, nombre: "Certificados médicos colaboradores", paraQue: "Examen de salud de cada trabajador.", vence: "Cada año", ley: "Res. 2674/2013" },
  { n: 13, nombre: "Soportes capacitación BPM", paraQue: "Listas de asistencia y fotos de las clases.", vence: "Guardar cada clase", ley: "Res. 2674/2013" },
  { n: 14, nombre: "Concepto Sanitario proveedores", paraQue: "Pida a quien le vende comida su concepto vigente.", vence: "Pedir copia anual", ley: "Res. 2674/2013 trazabilidad" },
  { n: 15, nombre: "SG-SST Sistema Salud y Trabajo", paraQue: "Cuida que nadie se accidente en el trabajo.", vence: "Mejora continua anual", ley: "Decreto 1072/2015" },
  { n: 16, nombre: "Programa Anual Capacitación SST", paraQue: "Calendario de charlas de seguridad del año.", vence: "Anual", ley: "Decreto 1072/2015" },
  { n: 17, nombre: "Plan Gestión Riesgo y Contingencia", paraQue: "Qué hacer si hay incendio, sismo o derrame.", vence: "Revisar cada año", ley: "Decreto 2157/2017" },
  { n: 18, nombre: "Capacitación a Brigadistas", paraQue: "Prueba de que su brigada sabe actuar.", vence: "Cada año", ley: "Decreto 1072/2015" },
  { n: 19, nombre: "Acta entrega Dotación Personal", paraQue: "Firma cuando entrega uniformes y zapatos.", vence: "3 veces al año (abr/ago/dic)", ley: "Código Trabajo art.230" },
  { n: 20, nombre: "Medidas Preventivas y Correctivas", paraQue: "Lista de arreglos que le pidió Salud y cómo los cerró.", vence: "Según plazo del acta", ley: "Res. 1229/2013" },
  { n: 21, nombre: "Hojas Seguridad Sustancias Químicas (FDS)", paraQue: "Ficha de cada químico: peligro y primeros auxilios.", vence: "Siempre en español y a la mano", ley: "Ley 55/1993 + Ley 9/1979" },
  { n: 22, nombre: "Normatividad Sanitaria", paraQue: "Carpeta con las leyes impresas: Ley 9, 2674, 1801.", vence: "Actualizar si sale ley nueva", ley: "Archivo" },
  { n: 23, nombre: "Certificado Manejo Plagas (fumigación)", paraQue: "Lo da empresa autorizada con concepto favorable.", vence: "Cada 3-6 meses; verificar en saludambiental.saludcapital.gov.co", ley: "Decreto 1843/1991" },
  { n: 24, nombre: "Certificado Lavado Tanque", paraQue: "Lo da empresa autorizada con concepto favorable.", vence: "Cada 6 meses", ley: "Decreto 1575/2007 art.10" },
  { n: 25, nombre: "Certificado Recolección Aceite Usado", paraQue: "Prueba de que no tira el aceite al sifón.", vence: "Cada entrega; guarde todos", ley: "Res. 316/2018 aceite usado" },
];

/** Explicación simple: qué revisa Salud en fábricas que usan químicos (Acta SQ01, ago-2025). */
export const IVC_SQ01 = [
  "2. Trabajadores: cuántos administrativos y operativos, turnos y horas; si hay menores con permiso.",
  "3. Local: pisos duros antideslizantes, paredes lavables, techos sanos, puertas/ventanas buenas, escaleras con baranda, ventilación e iluminación, zona química separada con matriz compatibilidad y contención derrames, basuras aparte. Ley 9/1979 art.90-207.",
  "4. Seguridad: máquinas con guardas y mantenimiento, señalización, extintores tipo A-B-C-F-D recargados, EPP según FDS, cables y fluidos en buen estado, botiquín Res.705/2007, FDS en español, químicos rotulados, capacitación manejo seguro.",
  "5. Sanitario: agua potable continua + tanque lavado cada 6 meses, alcantarillado sin reflujo, baños suficientes y limpios, aseo diario, basuras separadas, gestor RESPEL autorizado, permiso vertimientos si aplica (Dec.1076/2015), sin polvo/olores, plagas con empresa autorizada (Dec.1843/1991).",
  "6. SG-SST: todos afiliados a ARL + salud, sistema Dec.1072/2015, ruido/vibración/temperatura cómodos.",
  "7. Emergencias: plan de riesgo Dec.2157/2017, rutas y alarmas, capacitación, teléfono emergencia, rombos NFPA, carga/descarga segura, kit antiderrames.",
  "8. Lista químicos: nombre comercial + genérico (ver FDS sección 1 y 3), estado sólido/líquido/gas, cantidad mensual kg/L/gal, con FDS sí/no.",
  "10-11. Energía y accidentes: caldera/horno/planta con capacidad y mantenimiento; anote derrames o incendios del año con fecha.",
  "12. Concepto: Favorable (todo bien), Con requerimientos (plazo en días), Desfavorable (riesgo o no cumplió plazo).",
];

/** Explicación simple: qué revisa Salud en barberías y belleza (Res. 2117/2010 + manual Res. 2827/2006). */
export const IVC_BELLEZA = [
  "3. Local: construcción firme fuera de riesgo; si es vivienda, entrada separada; pasillos libres; sala espera aparte; pisos/paredes/techos en material sanitario claro y limpio; muebles resistentes a químicos; luz y escaleras seguras.",
  "4. Sanitario: agua potable + tanque lavado 6 meses; lavacabezas aparte con desagüe; alcantarillado + sifones; baños con jabón/toallas/papelera tapa (1 por 15 personas Res.2400/1979); área asepsia con lavamanos; poceta solo para traperos; casilleros ropa calle/trabajo.",
  "5-8. Seguridad: herramientas con filo y mantenimiento, no llevar cuchillas en bolsillo, seguir manual del fabricante, cables canalizados con polo a tierra, señalización + Ley 1335, extintor según riesgo, red eléctrica sin sobrecarga.",
  "9-11. Botiquín Res.705/2007 señalizado; alimentos solo en zona aparte con desechables; fumigación + lavado tanque mínimo 1 vez/año con empresa con concepto favorable.",
  "12. Bioseguridad: ventilación con aire fresco, toalla limpia por cliente, EPP (tapabocas, gafas, guantes, bata), lavado manos 8 momentos, limpieza-desinfección-esterilización entre clientes, manejo cosméticos (leer etiqueta, no mezclar, no fumar).",
  "13-15. Cosméticos solo con Notificación Sanitaria Obligatoria vigente (verificar en consultaregistro.invima.gov.co, grupo COSMÉTICOS/ASEO/MÉDICO-QUIRÚRGICOS); tabla productos con tipo D/C/O, NSO, estado y cantidad; residuos pesados en kg promedio 6 meses.",
  "16. Concepto Res.1229/2013: Favorable, Con requerimientos (plazo), Desfavorable (sanción). Deje constancia de socialización y firme observaciones.",
];

/** Explicación simple: qué revisa Salud en fábricas de colchones (Acta SQ12 + Res. 1842/2009). */
export const IVC_COLCHONES = [
  "3. Local: fuera de riesgo, pisos lisos impermeables, paredes/techos claros lavables, luz y aire suficientes, áreas separadas (materia prima / costura / producto), escaleras antideslizantes, cables cubiertos lejos del agua.",
  "4. Sanitario colchones: bodega seca sin humedad; espuma y tela en estantes, no en piso; materia prima 100% nueva (sin ropa usada ni pañales); si es reciclada, laboratorio que diga sin hongos; facturas que prueben de dónde viene + concepto del proveedor; aseo diario; basuras con gestor.",
  "5. Agua y baños: acueducto continuo o tanque lavado 6 meses, alcantarillado, baños por género limpios, fumigación mínima cada 6 meses (Dec.1843/1991).",
  "6-7. Trabajadores con ARL y salud, SG-SST Dec.1072/2015, máquinas con guardas, EPP, señalización, plan de riesgo Dec.2157/2017, extintores A-B-C-K-D, botiquín, FDS y etiquetas en español, kit derrames.",
  "8-9. Tablas de químicos y colchones producidos en kg/L/mes; concepto Favorable / Con plazo / Desfavorable.",
];

/** Explicación simple: el PDF AS02C no tenía texto para leer; pida el acta física para cargarla. */
export const NOTA_AS02C = "El archivo 'instructivo acta AS02C.pdf' llegó sin texto legible (escaneado). Suba el acta legible o dígame el tema y la sumo a esta guía.";

/**
 * Matriz Regulatoria Oficial de Autoridades de Inspección en Bogotá D.C.
 * Explicación simple: Qué pide cada autoridad cuando llega a la puerta de su negocio en Bogotá,
 * qué documento debe mostrar de inmediato y cómo defenderse legalmente.
 */
export const AUTORIDADES_BOGOTA = [
  {
    id: "salud",
    autoridad: "Secretaría Distrital de Salud de Bogotá (Subredes Norte, Sur, Centro Oriente, Sur Occidente)",
    sigla: "Salud Bogotá (IVC)",
    icono: "🏛️",
    color: "#0e7c4b",
    alcance: "Inspección, Vigilancia y Control Sanitario (Actas Oficiales IVC)",
    normasClave: "Ley 9 de 1979, Res. 2674 de 2013, Res. 1229 de 2013",
    queExige: [
      {
        requisito: "Concepto Sanitario Vigente / Última Acta de Visita IVC",
        norma: "Ley 9 de 1979 Art. 564, Res. 1229/2013",
        documentoTipo: "5. Concepto Sanitario",
        consejo: "Muestre de inmediato el acta anterior y evidencie que subsanó los requerimientos si los hubo.",
        frecuencia: "Anual o por visita oficial"
      },
      {
        requisito: "Plan de Saneamiento Básico Documentado (4 Programas con Formatos)",
        norma: "Res. 2674/2013 Art. 26",
        documentoTipo: "7. Procedimiento Limpieza y Desinfección",
        consejo: "Debe exhibir los 4 programas: Limpieza y Desinfección, Residuos, Plagas y Calidad de Agua.",
        frecuencia: "Permanente con registros diarios al día"
      },
      {
        requisito: "Certificado de Control Integral de Plagas (Fumigación)",
        norma: "Decreto 1843/1991",
        documentoTipo: "23. Certificado Manejo Plagas (fumigación)",
        consejo: "La empresa fumigadora debe tener Concepto Sanitario Favorable vigente de la Secretaría de Salud de Bogotá.",
        frecuencia: "Cada 3 a 6 meses"
      },
      {
        requisito: "Certificado de Lavado y Desinfección de Tanques de Agua Potable",
        norma: "Decreto 1575/2007 Art. 10",
        documentoTipo: "24. Certificado Lavado Tanque",
        consejo: "Obligatorio cada 6 meses. Exija copia del concepto favorable de la empresa que realizó el lavado.",
        frecuencia: "Semestral (cada 6 meses)"
      },
      {
        requisito: "Certificados Médicos Ocupacionales y Pruebas de Laboratorio de Manipuladores",
        norma: "Res. 2674/2013 Art. 11, 12 y 13",
        documentoTipo: "12. Certificados médicos colaboradores",
        consejo: "Deben incluir frotis faríngeo, KOH de uñas y coprológico con concepto de aptitud médica para manipular alimentos.",
        frecuencia: "Anual o al contratar"
      },
      {
        requisito: "Constancias de Capacitación en Manipulación de Alimentos y BPM",
        norma: "Res. 2674/2013 Art. 13",
        documentoTipo: "11. Programa Capacitación BPM y Alimentos",
        consejo: "Plan anual de capacitación continuo (mínimo 10-60 horas) con listas de asistencia y certificados de los trabajadores.",
        frecuencia: "Plan continuo anual"
      }
    ]
  },
  {
    id: "bomberos",
    autoridad: "Cuerpo Oficial de Bomberos de Bogotá D.C.",
    sigla: "Bomberos Bogotá",
    icono: "🚒",
    color: "#b91c1c",
    alcance: "Seguridad Humana, Protección Contra Incendios y Prevención",
    normasClave: "Ley 1575 de 2012, Ley 1796 de 2016, Dec. 3888 de 2007",
    queExige: [
      {
        requisito: "Concepto Técnico de Bomberos de Bogotá",
        norma: "Ley 1575/2012 Art. 42",
        documentoTipo: "4. Bomberos (concepto técnico)",
        consejo: "Se tramita anualmente en bomberosbogota.gov.co. Si la visita está en trámite, muestre el radicado oficial.",
        frecuencia: "Anual"
      },
      {
        requisito: "Extintores de Incendio Recargados, Señalizados y Vigentes",
        norma: "NTC 2885, NSR-10 Título J y K",
        documentoTipo: "4. Bomberos (concepto técnico)",
        consejo: "Altura máx. 1.50m al soporte, tipo Multipropósito ABC o Solkaflam, o Acetato de Potasio Tipo K para cocinas.",
        frecuencia: "Revisión mensual, recarga anual"
      },
      {
        requisito: "Botiquín de Primeros Auxilios Reglamentario para Bogotá",
        norma: "Resolución 705 de 2007 de Bogotá D.C.",
        documentoTipo: "15. SG-SST Sistema Salud y Trabajo",
        consejo: "Verifique si corresponde Tipo A (<2000 m²), B o C con elementos sellados y sin caducidades vencidas.",
        frecuencia: "Revisión trimestral"
      },
      {
        requisito: "Plan de Emergencias y Contingencias con Brigada y Rutas",
        norma: "Decreto 2157/2017, Dec. 1072/2015",
        documentoTipo: "17. Plan Gestión Riesgo y Contingencia",
        consejo: "Debe contar con plano de evacuación visible, rutas señalizadas, camilla rígida y brigadistas capacitados.",
        frecuencia: "Anual con simulacro distrital"
      }
    ]
  },
  {
    id: "policia",
    autoridad: "Policía Nacional & Alcaldía Local de Bogotá (Ley 1801 de 2016)",
    sigla: "Policía Ley 1801 / Inspección",
    icono: "👮",
    color: "#1d4ed8",
    alcance: "Código Nacional de Seguridad y Convivencia Ciudadana",
    normasClave: "Ley 1801 de 2016 Art. 87 (Requisitos de Apertura y Funcionamiento)",
    queExige: [
      {
        requisito: "Matrícula Mercantil Vigente de Cámara de Comercio de Bogotá",
        norma: "Ley 1801/2016 Art. 87 num. 1",
        documentoTipo: "1. Cámara de Comercio",
        consejo: "Debe renovarse antes del 31 de marzo de cada año. Tenga el certificado impreso o accesible en su celular.",
        frecuencia: "Anual (antes del 31 de marzo)"
      },
      {
        requisito: "Comunicación Previa de Apertura a la Alcaldía Local",
        norma: "Ley 1801/2016 Art. 87 num. 2",
        documentoTipo: "6. Apertura establecimiento / Ley 1801",
        consejo: "Oficio o radicado virtual ante la Secretaría de Gobierno / Alcaldía Local antes de abrir el negocio.",
        frecuencia: "Única vez al abrir o cambiar de sede"
      },
      {
        requisito: "Concepto de Uso de Suelo Compatible en Bogotá",
        norma: "POT Bogotá Dec. 555/2021, Ley 1801 Art. 87 num. 3",
        documentoTipo: "3. Sayco-Acinpro + Uso de Suelo",
        consejo: "Descargue el concepto en SINUPOT verificando que la actividad económica CIIU esté permitida en esa dirección.",
        frecuencia: "Permanente mientras no cambie de sede"
      },
      {
        requisito: "Comprobante de Pago Sayco-Acinpro o Carta de No Ejecución Musical",
        norma: "Ley 23 de 1982, Ley 1801 Art. 87 num. 4",
        documentoTipo: "3. Sayco-Acinpro + Uso de Suelo",
        consejo: "Si no pone música comercial ni TV para clientes, mantenga la carta jurada de No Ejecución firmada a la mano.",
        frecuencia: "Anual"
      }
    ]
  },
  {
    id: "tributario_ambiental",
    autoridad: "DIAN, Hacienda Distrital & Secretaría Distrital de Ambiente (SDA)",
    sigla: "Tributario y Ambiental",
    icono: "♻️",
    color: "#047857",
    alcance: "Obligaciones Tributarias y Ambientales en el Distrito Capital",
    normasClave: "Estatuto Tributario, Res. 316/2018 (Aceite Cocina Usado), Dec. 1076/2015",
    queExige: [
      {
        requisito: "Registro Único Tributario (RUT - DIAN)",
        norma: "Estatuto Tributario Art. 555-2",
        documentoTipo: "2. RUT / DIAN / RIT",
        consejo: "Verifique que la dirección y el código CIIU coincidan exactamente con la Cámara de Comercio.",
        frecuencia: "Actualizar si cambian datos"
      },
      {
        requisito: "Registro de Información Tributaria de Bogotá (RIT - ICA)",
        norma: "Acuerdo Distrital 65 de 2002",
        documentoTipo: "2. RUT / DIAN / RIT",
        consejo: "Demuestra la inscripción en el impuesto de Industria y Comercio ante la Secretaría de Hacienda de Bogotá.",
        frecuencia: "Permanente"
      },
      {
        requisito: "Certificado de Entrega de Aceite de Cocina Usado (ACU)",
        norma: "Resolución 316 de 2018 MinAmbiente / SDA Bogotá",
        documentoTipo: "25. Certificado Recolección Aceite Usado",
        consejo: "Prohibido verter aceite al sifón. Exija el certificado con número de radicado del gestor ante la SDA.",
        frecuencia: "Por cada recolección realizada"
      }
    ]
  }
];

