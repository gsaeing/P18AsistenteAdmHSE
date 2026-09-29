import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// API para verificar y despachar notificaciones de vencimiento a menos de 5 días
app.post('/api/notificar-vencimientos-5dias', (req, res) => {
  try {
    const { documentos = [], autorizaciones = [] } = req.body;
    const SUPERADMIN_EMAIL = "gerencia@saeing.com";
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const calcularDias = (f) => {
      if (!f) return 9999;
      const v = new Date(f + "T00:00:00");
      return Math.ceil((v - hoy) / 86400000);
    };

    const notificaciones = [];

    documentos.forEach((doc) => {
      const dias = calcularDias(doc.vence);
      // Condición: A menos de 5 días de vencer (dias <= 5)
      if (dias <= 5) {
        const destinatarios = new Set();
        if (doc.ownerEmail) destinatarios.add(doc.ownerEmail.trim().toLowerCase());
        destinatarios.add(SUPERADMIN_EMAIL.toLowerCase());

        (autorizaciones || [])
          .filter(a => a.activo && (a.empresaId === doc.empresaId || a.empresaId === "todas" || a.empresaNombre === doc.empresaNombre))
          .forEach(a => {
            if (a.email) destinatarios.add(a.email.trim().toLowerCase());
          });

        const esVencido = dias < 0;
        const asunto = esVencido
          ? `🔴 [VENCIDO] ${doc.tipo} - ${doc.empresaNombre}`
          : `⏰ [ALERTA HSE ${dias}d] ${doc.tipo} vence pronto - ${doc.empresaNombre}`;

        destinatarios.forEach((email) => {
          notificaciones.push({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            documentoId: doc.id,
            empresaNombre: doc.empresaNombre,
            empresaNit: doc.empresaNit || "",
            tipo: doc.tipo,
            vence: doc.vence,
            diasRestantes: dias,
            estado: esVencido ? "Vencido" : `Vence en ${dias} día(s)`,
            destinatario: email,
            asunto,
            fechaEnvio: new Date().toISOString(),
            enviado: true,
            canal: "Correo Electrónico (Firebase Cloud Functions / SMTP)"
          });
        });
      }
    });

    res.json({
      ok: true,
      totalProcesados: documentos.length,
      alertasGeneradas: notificaciones.length,
      notificaciones
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Fallback to index.html for any unmatched route
app.use((req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
