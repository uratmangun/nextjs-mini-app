import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Verify webhook signature for security
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-farcaster-signature');
    const secret = process.env.FARCASTER_WEBHOOK_SECRET;

    // Verify webhook if secret is configured
    if (secret && signature) {
      const isValid = verifyWebhookSignature(body, signature, secret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);
    
    // Handle different webhook events
    switch (data.type) {
      case 'app.installed':
        console.log('App installed by user:', data.user);
        // Handle app installation
        break;
      
      case 'app.uninstalled':
        console.log('App uninstalled by user:', data.user);
        // Handle app uninstallation
        break;
      
      case 'notification.acknowledged':
        console.log('Notification acknowledged:', data.notificationId);
        // Handle notification acknowledgment
        break;
      
      default:
        console.log('Unknown webhook event:', data.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
