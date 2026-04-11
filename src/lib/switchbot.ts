import crypto from 'crypto';

export function getSwitchbotHeaders() {
  const token = process.env.SWITCHBOT_TOKEN || '';
  const secret = process.env.SWITCHBOT_SECRET || '';
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const data = token + t + nonce;
  const signTerm = crypto.createHmac('sha256', secret).update(Buffer.from(data, 'utf-8')).digest();
  const sign = signTerm.toString('base64');
  
  return {
    'Authorization': token,
    'sign': sign,
    'nonce': nonce,
    't': t,
    'Content-Type': 'application/json'
  };
}
