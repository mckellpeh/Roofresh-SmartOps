# Roofresh SmartOps Dashboard

A centralized, scalable IoT control ecosystem built specifically for Roofresh. This application leverages a cutting-edge **Next.js Server-Side Framework** to communicate completely autonomously with physical Switchbot architecture. 

It handles complex environment manipulations remotely for precision mushroom cultivation and aggregates hyper-localized open-source weather metrics completely free of API barriers.

## Architecture & Features

1. **Global Unified Dashboard (`/`)**
   - Automatically surveys and logs configured container nodes directly from the `src/config/containers.ts` map.
   - Securely tunnels to Switchbot Cloud endpoints to retrieve real-time temperature and humidity analytics visually.

2. **Container Micro-Interfaces (`/containers/[id]`)**
   - Intelligently isolates parameters per discrete container, mitigating operational errors and creating a clean structural flow.

3. **Complex Remote Actuation (`/temperature` & `/humidity`)**
   - Seamlessly executes `[powerState, mode, temperature, fanSpeed]` string signatures precisely formatted for Switchbot IR bridges.
   - Built intuitively around dynamic layout UI constructs, replacing archaic physical remotes with streamlined sliders.

4. **Weather Forecasting Native (`/weather`)**
   - Implements native zero-auth coordinate-based forecasts using the incredible `Open-Meteo` REST topology specifically mapped to Pasir Ris Central.

---

## Developer Operations (DevOps)

### Running Locally

To edit or interact with the project on your own machine:

1. Guarantee that `Node.js` is installed on your computer.
2. Within the folder directory terminal, install the required packages:
   ```bash
   npm install
   ```
3. Boot the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access `http://localhost:3000` via your web browser.

### Security Configurations
You **must** explicitly define a `.env.local` file placed seamlessly in the root of the repo (do not commit this file to GitHub) with the following parameters:

```env
SWITCHBOT_TOKEN="YOUR_UNIQUE_TOKEN"
SWITCHBOT_SECRET="YOUR_SECRET"

NEXT_PUBLIC_SWITCHBOT_HUB_ID="CONTAINER_IR_BLASTER_HUB_MAC_ADDRESS"
NEXT_PUBLIC_SWITCHBOT_AC_ID="CONTAINER_AC_ID"
NEXT_PUBLIC_SWITCHBOT_BOT_ID="CONTAINER_HUMIDIFIER_BOT_ID"
```

## Production Deployment
**(Recommended: Vercel - 100% Free)**

Because the Roofresh layout utilizes the Next.js App Router topology, caching, and server components, standard deployment is radically simplified via Vercel.

1. Connect your GitHub repository iteratively to your [Vercel](https://vercel.com) Dashboard.
2. Ensure you specifically populate all variables from your localized `.env.local` exactly into the Vercel **Environment Variables** panel BEFORE building.
3. Once deployed, Vercel manages the SSL encryptions perfectly, pushing any future `master` branch updates iteratively directly into live circulation!
