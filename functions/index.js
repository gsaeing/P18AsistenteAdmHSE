/**
 * Firebase Cloud Functions para Asistente Adm HSE Colombia
 * Función programada y HTTP para enviar notificaciones por correo electrónico
 * a los usuarios cuando un documento esté a menos de 5 días de vencer.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const SUPERADMIN_EMAIL = "gerencia@saeing.com";
const DIAS_UMBRAL_NOTIFICACION = 5;

/**
 * Calcula los días que faltan para el vencimiento (mismo algoritmo que el frontend)
 */
function calcularDiasRestantes(fechaStr) {
  if (!fechaStr) return 9999;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaStr + "T00:00:00");
  return Math.ceil((vence - hoy) / 86400000);
}

/**
 * Determina el estado del documento basado en días restantes
 */
function clasificarEstadoDoc(dias) {
  if (dias < 0) return { texto: "Vencido", clase: "vencido", urgencia: "ALTA" };
  if (dias <= DIAS_UMBRAL_NOTIFICACION) return { texto: `Vence en ${dias} día(s)`, clase: "critico", urgencia: "CRITICA" };
  if (dias <= 15) return { texto: `Por vencer (${dias}d)`, clase: "por-vencer", urgencia: "MEDIA" };
  return { texto: `Vigente (${dias}d)`, clase: "vigente", urgencia: "BAJA" };
}

/**
 * Configura el transportador de correo (SMTP o modo desarrollo)
 */
function obtenerTransportadorCorreo() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass }
    });
  }

  // Si no hay SMTP configurado, simula el envío con transportador JSON log
  return {
    sendMail: async (mailOptions) => {
      console.log("[Cloud Functions Email Simulado]:", JSON.stringify(mailOptions, null, 2));
      return { messageId: "sim_" + Date.now(), response: "Simulated send ok" };
    }
  };
}

/**
 * Genera la plantilla HTML ejecutiva para el correo de notificación
 */
function generarCuerpoHTMLNotificacion(doc, dias, estado, destinatario) {
  const esVencido = dias < 0;
  const colorBorde = esVencido ? "#c62828" : "#e65100";
  const tituloAlerta = esVencido
    ? `🚨 DOCUMENTO LEGAL VENCIDO HACE ${Math.abs(dias)} DÍAS`
    : `⚠️ ATENCIÓN: DOCUMENTO PRÓXIMO A VENCER EN ${dias} DÍAS`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #dcdcdc; border-top: 6px solid ${colorBorde}; border-radius: 8px; overflow: hidden; background: #ffffff;">
      <div style="background: #0e7c4b; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">🇨🇴 Asistente Adm HSE Colombia</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Control Legal y Documental de Establecimientos de Comercio</p>
      </div>

      <div style="padding: 24px;">
        <div style="background: ${esVencido ? '#ffebee' : '#fff3e0'}; border-left: 4px solid ${colorBorde}; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 6px; color: ${colorBorde}; font-size: 16px;">${tituloAlerta}</h3>
          <p style="margin: 0; font-size: 14px; color: #333333;">
            Estimado usuario (<b>${destinatario}</b>), le informamos que el requisito legal indicado a continuación requiere renovación inmediata para evitar sanciones higiénico-sanitarias o policivas (Ley 9/1979, Ley 1801/2016 y Res. 2674/2013).
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666; width: 40%;"><b>Empresa / Comercio:</b></td>
            <td style="padding: 8px 0; color: #111111;"><b>${doc.empresaNombre || "Empresa"}</b></td>
          </tr>
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>NIT:</b></td>
            <td style="padding: 8px 0; color: #111111;">${doc.empresaNit || "No registrado"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>Requisito Legal:</b></td>
            <td style="padding: 8px 0; color: #0e7c4b; font-weight: bold;">${doc.tipo || "Documento Legal"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>Número / Radicado:</b></td>
            <td style="padding: 8px 0; color: #111111;">${doc.numero || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>Fecha de Vencimiento:</b></td>
            <td style="padding: 8px 0; color: ${colorBorde}; font-weight: bold;">${doc.vence}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>Días Restantes:</b></td>
            <td style="padding: 8px 0; color: ${colorBorde}; font-weight: bold;">${dias} día(s) (${estado.texto})</td>
          </tr>
          ${doc.nota ? `
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 8px 0; color: #666666;"><b>Observaciones:</b></td>
            <td style="padding: 8px 0; color: #333333;">${doc.nota}</td>
          </tr>` : ""}
        </table>

        <div style="background: #f4faf6; border: 1px solid #cfead7; padding: 14px; border-radius: 6px; margin-bottom: 22px;">
          <h4 style="margin: 0 0 6px; color: #0e7c4b;">¿Necesita asesoría técnica o renovación de certificados?</h4>
          <p style="margin: 0 0 10px; font-size: 13px; color: #333;">
            Nuestro equipo de consultores expertos en HSE Colombia puede ayudarle con conceptos sanitarios, capacitaciones BPM, planes de saneamiento y trámites bomberiles.
          </p>
          <a href="https://wa.me/573008587973?text=Hola%2C%20recib%C3%AD%20alerta%20de%20vencimiento%20del%20documento%20${encodeURIComponent(doc.tipo)}%20de%20${encodeURIComponent(doc.empresaNombre)}" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 8px 14px; border-radius: 4px; font-size: 13px; font-weight: bold;">
            💬 Contactar por WhatsApp: 300 858 7973
          </a>
        </div>

        <p style="font-size: 12px; color: #777777; margin: 0; line-height: 1.4;">
          Este mensaje fue emitido automáticamente por la plataforma <b>Asistente Adm HSE Colombia</b> gestionada por <b>gerencia@saeing.com</b>.<br />
          Para consultar o actualizar sus archivos adjuntos, ingrese a la aplicación con su cuenta de Google autorizada.
        </p>
      </div>
    </div>
  `;
}

/**
 * Función central de escaneo y envío de notificaciones
 */
async function procesarAlertasVencimientos() {
  const transporter = obtenerTransportadorCorreo();
  const resultados = {
    fechaEjecucion: new Date().toISOString(),
    totalDocumentosRevisados: 0,
    alertasEmitidas: 0,
    detalles: []
  };

  // 1. Obtener todos los documentos
  const docsSnapshot = await db.collection("documentos").get();
  resultados.totalDocumentosRevisados = docsSnapshot.size;

  // 2. Obtener lista de usuarios autorizados
  const authSnapshot = await db.collection("autorizaciones").where("activo", "==", true).get();
  const autorizaciones = authSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  for (const docSnapshot of docsSnapshot.docs) {
    const docData = docSnapshot.data();
    const dias = calcularDiasRestantes(docData.vence);
    const estado = clasificarEstadoDoc(dias);

    // Condición: A menos de 5 días de vencer (dias <= 5)
    if (dias <= DIAS_UMBRAL_NOTIFICACION) {
      // Determinar destinatarios:
      // a) Propietario que cargó el documento
      // b) Usuarios autorizados para esa empresa o con acceso global ("todas")
      // c) Superadministrador gerencia@saeing.com
      const correosDestino = new Set();
      if (docData.ownerEmail) correosDestino.add(docData.ownerEmail.trim().toLowerCase());
      correosDestino.add(SUPERADMIN_EMAIL.toLowerCase());

      autorizaciones
        .filter(a => a.empresaId === docData.empresaId || a.empresaId === "todas" || a.empresaNombre === docData.empresaNombre)
        .forEach(a => {
          if (a.email) correosDestino.add(a.email.trim().toLowerCase());
        });

      for (const emailDestino of correosDestino) {
        const asunto = dias < 0
          ? `🔴 [VENCIDO] ${docData.tipo} - ${docData.empresaNombre}`
          : `⏰ [ALERTA HSE ${dias}d] ${docData.tipo} vence pronto - ${docData.empresaNombre}`;

        const html = generarCuerpoHTMLNotificacion(docData, dias, estado, emailDestino);

        try {
          // 1. Enviar correo vía transportador
          const remitente = process.env.MAIL_FROM || `"Asistente Adm HSE" <alertas@saeing.com>`;
          await transporter.sendMail({
            from: remitente,
            to: emailDestino,
            subject: asunto,
            html
          });

          // 2. Guardar registro en la colección /notificaciones de Firestore
          const registroNotif = {
            documentoId: docSnapshot.id,
            empresaId: docData.empresaId || "",
            empresaNombre: docData.empresaNombre || "",
            tipoDocumento: docData.tipo,
            vence: docData.vence,
            diasRestantes: dias,
            estado: estado.texto,
            destinatario: emailDestino,
            asunto,
            fechaEnvio: new Date().toISOString(),
            enviado: true
          };

          await db.collection("notificaciones").add(registroNotif);

          // 3. Cola de correo de Firebase Extension (Trigger Email) si está instalada
          await db.collection("mail").add({
            to: [emailDestino],
            message: {
              subject: asunto,
              html
            }
          }).catch(() => {});

          resultados.alertasEmitidas++;
          resultados.detalles.push({
            documentoId: docSnapshot.id,
            tipo: docData.tipo,
            empresa: docData.empresaNombre,
            dias,
            destinatario: emailDestino,
            exito: true
          });
        } catch (error) {
          console.error(`Error enviando correo a ${emailDestino} para doc ${docSnapshot.id}:`, error);
          resultados.detalles.push({
            documentoId: docSnapshot.id,
            tipo: docData.tipo,
            destinatario: emailDestino,
            exito: false,
            error: error.message
          });
        }
      }
    }
  }

  return resultados;
}

/**
 * Cloud Function Programada (Cron diario a las 8:00 AM hora de Colombia)
 */
export const notificarVencimientosDiarios = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "America/Bogota",
    retryCount: 2
  },
  async () => {
    console.log("Iniciando escaneo diario de documentos a menos de 5 días de vencer...");
    const res = await procesarAlertasVencimientos();
    console.log(`Escaneo finalizado: ${res.alertasEmitidas} alerta(s) enviadas para ${res.totalDocumentosRevisados} documentos revisados.`);
  }
);

/**
 * Cloud Function HTTPS para verificación manual o prueba bajo demanda desde el frontend
 */
export const verificarVencimientosHttp = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const resultado = await procesarAlertasVencimientos();
      res.status(200).json({
        ok: true,
        mensaje: `Se verificaron los documentos y se emitieron ${resultado.alertasEmitidas} notificaciones para requisitos a menos de 5 días.`,
        resultado
      });
    } catch (e) {
      console.error("Error en verificarVencimientosHttp:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);
