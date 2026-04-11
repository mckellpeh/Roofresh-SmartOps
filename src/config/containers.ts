export interface Container {
  id: string;
  name: string;
  hubId: string;
  acId: string;
  humidifierId: string;
}

export const CONTAINERS: Container[] = [
  {
    id: 'container-left',
    name: 'Container 1 (Left)',
    hubId: process.env.NEXT_PUBLIC_SWITCHBOT_HUB_ID || 'E72E155B2FE9',
    acId: process.env.NEXT_PUBLIC_SWITCHBOT_AC_ID || '02-202404091830-26069818',
    humidifierId: process.env.NEXT_PUBLIC_SWITCHBOT_BOT_ID || 'D03534364B97',
  }
];
