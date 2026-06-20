export interface Container {
  id: string;
  name: string;
  hubId: string;
  acId: string;
  humidifierId: string;
  humidifierOnId: string;
  humidifierOffId: string;
  imageUrl: string;
}

export const CONTAINERS: Container[] = [
  {
    id: 'container-left',
    name: 'Container 1 (Left)',
    hubId: process.env.NEXT_PUBLIC_SWITCHBOT_HUB_ID || 'E72E155B2FE9',
    acId: process.env.NEXT_PUBLIC_SWITCHBOT_AC_ID || '02-202404091830-26069818',
    humidifierId: process.env.NEXT_PUBLIC_SWITCHBOT_BOT_ID || 'D03534364B97',
    humidifierOnId: process.env.NEXT_PUBLIC_SWITCHBOT_BOT_ON_ID || 'E16A83063D8E',
    humidifierOffId: process.env.NEXT_PUBLIC_SWITCHBOT_BOT_OFF_ID || 'D03534364B97',
    imageUrl: '/containers/Left Container.jpeg',
  },
  {
    id: 'container-right',
    name: 'Container 2 (Right)',
    hubId: 'Pending',
    acId: 'Pending',
    humidifierId: 'Pending',
    humidifierOnId: 'Pending',
    humidifierOffId: 'Pending',
    imageUrl: '/containers/Right Container.jpeg',
  }
];
