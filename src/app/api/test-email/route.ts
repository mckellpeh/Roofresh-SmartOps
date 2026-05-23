import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'mckellpeh@gmail.com';
    
    const containerId = 'container-left';
    
    // Dynamic imports to prevent circular references
    const { getAutoTempState, updateAutoTempState } = await import('@/lib/autoTempStore');
    const { sendEmailAlert } = await import('@/lib/alerts');
    
    const originalState = getAutoTempState(containerId);
    
    // Temporarily set email and reset throttling to force immediate dispatch
    updateAutoTempState(containerId, {
      alertEmail: email,
      lastAlertSentAt: null
    });
    
    console.log(`[Test Route] Dispatching immediate critical heat test alert to ${email}...`);
    
    await sendEmailAlert({
      containerId,
      type: 'critical',
      currentTemp: 29.5,
      criticalLimit: 28
    });
    
    // Restore original alert configurations
    updateAutoTempState(containerId, {
      alertEmail: originalState.alertEmail,
      lastAlertSentAt: originalState.lastAlertSentAt
    });

    const isConfigured = !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST);

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      gateway: process.env.RESEND_API_KEY ? 'Resend API' : (process.env.SMTP_HOST ? 'SMTP Relay' : 'Sandbox (Mock Mode)'),
      message: isConfigured 
        ? `A real temperature alert email has been successfully dispatched to ${email}!`
        : `A simulated test email has been printed in Sandbox Mock Mode! To send a real email directly to your inbox, simply add a RESEND_API_KEY or SMTP_HOST in your local .env.local file.`,
      instructions: !isConfigured ? [
        "1. Open your local '.env.local' file in the editor.",
        "2. Add this line: RESEND_API_KEY=your_key_here (You can get a free key in 30 seconds at resend.com)",
        "3. Restart the server with 'npm run dev' and refresh this URL to get a real email instantly!"
      ] : []
    });
  } catch (error: any) {
    console.error('[Test Route] Error triggering test email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
