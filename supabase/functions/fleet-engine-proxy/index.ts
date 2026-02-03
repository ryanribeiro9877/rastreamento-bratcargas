// supabase/functions/fleet-engine-proxy/index.ts
// Edge Function para intermediar comunicação com Google Fleet Engine

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FleetEngineConfig {
  projectId: string;
  providerId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

class FleetEngineService {
  private config: FleetEngineConfig;
  private baseUrl: string;

  constructor(config: FleetEngineConfig) {
    this.config = config;
    this.baseUrl = `https://fleetengine.googleapis.com/v1/providers/${config.providerId}`;
  }

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.config.serviceAccountEmail,
      sub: this.config.serviceAccountEmail,
      aud: 'https://fleetengine.googleapis.com/',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(this.config.privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${signatureInput}.${encodedSignature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async createDeliveryVehicle(vehicleId: string, motoristaNome: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/deliveryVehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deliveryVehicleId: vehicleId,
        name: `${this.config.providerId}/deliveryVehicles/${vehicleId}`,
        attributes: [
          {
            key: 'driver_name',
            value: motoristaNome,
          },
        ],
      }),
    });

    return await response.json();
  }

  async updateVehicleLocation(
    vehicleId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number
  ): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/deliveryVehicles/${vehicleId}?updateMask=lastLocation`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastLocation: {
            location: {
              latitude,
              longitude,
            },
            heading,
            speed,
            updateTime: new Date().toISOString(),
          },
        }),
      }
    );

    return await response.json();
  }

  async createDeliveryTask(
    taskId: string,
    vehicleId: string,
    carga: any
  ): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        name: `${this.config.providerId}/tasks/${taskId}`,
        type: 'DELIVERY',
        state: 'OPEN',
        taskOutcome: 'SUCCEEDED',
        taskOutcomeTime: carga.prazo_entrega,
        plannedLocation: {
          point: {
            latitude: carga.destino_lat,
            longitude: carga.destino_lng,
          },
        },
        attributes: [
          {
            key: 'nota_fiscal',
            value: carga.nota_fiscal,
          },
          {
            key: 'embarcador',
            value: carga.embarcador?.razao_social || '',
          },
        ],
      }),
    });

    return await response.json();
  }

  async assignTaskToVehicle(taskId: string, vehicleId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/tasks/${taskId}?updateMask=deliveryVehicleId`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryVehicleId: vehicleId,
        }),
      }
    );

    return await response.json();
  }

  async generateJWTForClient(vehicleId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const payload = {
      iss: this.config.serviceAccountEmail,
      sub: this.config.serviceAccountEmail,
      aud: 'https://fleetengine.googleapis.com/',
      iat: now,
      exp: expiry,
      authorization: {
        deliveryvehicleid: vehicleId,
      },
    };

    return btoa(JSON.stringify(payload));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const config: FleetEngineConfig = {
      projectId: Deno.env.get('FLEET_ENGINE_PROJECT_ID')!,
      providerId: Deno.env.get('FLEET_ENGINE_PROVIDER_ID')!,
      serviceAccountEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!,
      privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')!,
    };

    const fleetEngine = new FleetEngineService(config);
    const { action, data } = await req.json();

    let result;

    switch (action) {
      case 'create_vehicle':
        result = await fleetEngine.createDeliveryVehicle(
          data.vehicleId,
          data.motoristaNome
        );
        break;

      case 'update_location':
        result = await fleetEngine.updateVehicleLocation(
          data.vehicleId,
          data.latitude,
          data.longitude,
          data.heading,
          data.speed
        );
        break;

      case 'create_task':
        result = await fleetEngine.createDeliveryTask(
          data.taskId,
          data.vehicleId,
          data.carga
        );
        break;

      case 'assign_task':
        result = await fleetEngine.assignTaskToVehicle(
          data.taskId,
          data.vehicleId
        );
        break;

      case 'generate_token':
        result = {
          token: await fleetEngine.generateJWTForClient(data.vehicleId),
        };
        break;

      default:
        throw new Error(`Action not supported: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
