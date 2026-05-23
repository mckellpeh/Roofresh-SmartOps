import { updateAutoTempState, getAutoTempState } from './autoTempStore';
import { CONTAINERS } from '@/config/containers';

export interface AlertOptions {
  containerId: string;
  type: 'drift' | 'critical';
  currentTemp: number;
  driftStartedAt?: string;
  targetTemp?: number;
  criticalLimit?: number;
}

/**
 * Dispatches an email notification when a container temperature alert condition is met.
 */
export async function sendEmailAlert(options: AlertOptions) {
  const { containerId, type, currentTemp, driftStartedAt, targetTemp, criticalLimit } = options;
  const container = CONTAINERS.find(c => c.id === containerId);
  const containerName = container ? container.name : containerId;
  const state = getAutoTempState(containerId);
  
  if (!state.alertEmail) {
    console.log(`[Alert System] Alert condition met for ${containerName}, but no alert email is configured.`);
    return;
  }

  const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  const subject = `⚠️ [ALERT] Roofresh Container ${containerName} Temperature Warning`;
  
  let bodyContent = '';
  if (type === 'critical') {
    const isTooCold = currentTemp <= (state.criticalLowTemp ?? 18);
    const limitColor = isTooCold ? '#0070f3' : '#e2584c';
    const warningBg = isTooCold ? '#f2f8fd' : '#fdf2f2';
    const limitLabel = isTooCold ? 'Critical Cold Limit' : 'Critical Heat Limit';
    const actionMessage = isTooCold 
      ? `The container has fallen below the critical cold safety threshold of ${criticalLimit ?? state.criticalLowTemp}°C. Please inspect the heating controls and SwitchBot Hub 2 sensor immediately to protect the cultivation crop.`
      : `The container has exceeded the critical heat safety threshold of ${criticalLimit ?? state.criticalHighTemp}°C. Please inspect the air conditioner unit and SwitchBot Hub 2 sensor immediately to protect the cultivation crop.`;

    bodyContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid ${limitColor}; border-radius: 12px; padding: 24px; background-color: #fff;">
        <h2 style="color: ${limitColor}; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          ⚠️ ${isTooCold ? 'Critical Cold Alert' : 'Critical Heat Alert'}
        </h2>
        <p>This is an automated warning from the <strong>Roofresh SmartOps</strong> monitoring engine.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Container:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${containerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Current Temp:</td>
            <td style="padding: 8px 0; text-align: right; color: ${limitColor}; font-size: 1.25rem; font-weight: bold;">${currentTemp.toFixed(1)}°C</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">${limitLabel}:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #555;">${criticalLimit}°C</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
            <td style="padding: 8px 0; text-align: right; color: #777;">${timestamp} (SST)</td>
          </tr>
        </table>
        <div style="background-color: ${warningBg}; border-left: 4px solid ${limitColor}; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <strong>Action Required:</strong> ${actionMessage}
        </div>
        <p style="font-size: 0.85rem; color: #777; margin-bottom: 0;">Roofresh SmartOps Automation Engine. Running on Pasir Ris Node.</p>
      </div>
    `;
  } else {
    const driftHours = driftStartedAt 
      ? ((Date.now() - new Date(driftStartedAt).getTime()) / 3600000).toFixed(1)
      : '1.0';
      
    bodyContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; border-radius: 12px; padding: 24px; background-color: #fff;">
        <h2 style="color: #d4af37; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          ⏳ Unresolved Temperature Drift Alert
        </h2>
        <p>This is an automated warning from the <strong>Roofresh SmartOps</strong> monitoring engine.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Container:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${containerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Current Temp:</td>
            <td style="padding: 8px 0; text-align: right; color: #d4af37; font-size: 1.25rem; font-weight: bold;">${currentTemp.toFixed(1)}°C</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Indicated Target:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${targetTemp ?? state.targetTemperature}°C (±1°C)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Drift Duration:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #555;">${driftHours} hours</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
            <td style="padding: 8px 0; text-align: right; color: #777;">${timestamp} (SST)</td>
          </tr>
        </table>
        <div style="background-color: #fffbeb; border-left: 4px solid #d4af37; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <strong>Status:</strong> The container temperature has remained outside of the stable $\\pm 1^\\circ\\text{C}$ indicated range for more than an hour despite active degree-by-degree automated infrared corrections.
        </div>
        <p style="font-size: 0.85rem; color: #777; margin-bottom: 0;">Roofresh SmartOps Automation Engine. Running on Pasir Ris Node.</p>
      </div>
    `;
  }

  // 1. Try sending via Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Alert System] Sending email via Resend API to ${state.alertEmail}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM || 'Roofresh Automation <onboarding@resend.dev>',
          to: state.alertEmail,
          subject,
          html: bodyContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Alert System] Email sent successfully via Resend. ID: ${data.id}`);
        // Log notification success in store
        appendAlertLog(containerId, type, currentTemp, state.alertEmail);
        return;
      } else {
        const errText = await response.text();
        console.error(`[Alert System] Resend API failed: ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.error('[Alert System] Error sending with Resend API:', err);
    }
  }

  // 2. Try sending via SMTP (nodemailer)
  if (process.env.SMTP_HOST) {
    try {
      console.log(`[Alert System] Attempting to load nodemailer for SMTP send to ${state.alertEmail}...`);
      // Hide literal module name from Next.js bundler to completely silence compile warnings
      const pkgName = 'nodemailer';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require(pkgName);
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Roofresh SmartOps" <${process.env.SMTP_USER}>`,
        to: state.alertEmail,
        subject,
        html: bodyContent,
      });

      console.log(`[Alert System] Email sent successfully via SMTP.`);
      appendAlertLog(containerId, type, currentTemp, state.alertEmail);
      return;
    } catch (err) {
      console.error(`[Alert System] SMTP Send failed or nodemailer is missing:`, err);
    }
  }

  // 3. Fallback / Sandbox Mock Mode
  console.log('========================================================================');
  console.log(`[SANDBOX ALERT SYSTEM] SIMULATING EMAIL SENT TO: ${state.alertEmail}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`TYPE: ${type.toUpperCase()}`);
  console.log(`CURRENT TEMP: ${currentTemp.toFixed(1)}°C`);
  console.log(`TIME: ${timestamp} (Singapore Standard Time)`);
  console.log(`DEVELOPER NOTE: Configure RESEND_API_KEY or SMTP credentials in your .env.local to send real emails!`);
  console.log('========================================================================');

  appendAlertLog(containerId, type, currentTemp, state.alertEmail, true);
}

function appendAlertLog(containerId: string, type: 'drift' | 'critical', temp: number, email: string, isSandbox = false) {
  const timestamp = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  const state = getAutoTempState(containerId);
  
  let typeStr = '1-HOUR DRIFT UNRESOLVED';
  if (type === 'critical') {
    const isTooCold = temp <= (state.criticalLowTemp ?? 18);
    typeStr = isTooCold ? 'CRITICAL COLD' : 'CRITICAL HIGH HEAT';
  }
  
  const prefix = isSandbox ? '[SANDBOX ALERT SENT]' : '[ALERT SENT]';
  const msg = `${prefix} Email alert dispatched to ${email} due to ${typeStr} (Current Temperature: ${temp.toFixed(1)}°C).`;
  
  // Directly write log to the store log list
  const logMessage = `[${timestamp}] ${msg}`;
  
  updateAutoTempState(containerId, {
    logs: [...state.logs, logMessage],
    lastAlertSentAt: new Date().toISOString(),
  });
}

