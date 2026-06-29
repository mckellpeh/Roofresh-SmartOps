import asyncio
import sys
import os
from tapo import ApiClient

async def main():
    if len(sys.argv) < 2:
        print("Error: Please provide the Tapo device IP address as an argument.")
        sys.exit(1)
        
    ip = sys.argv[1]
    email = os.environ.get('TAPO_EMAIL')
    password = os.environ.get('TAPO_PASSWORD')
    
    if not email or not password:
        print("Error: TAPO_EMAIL or TAPO_PASSWORD environment variables are not set.")
        sys.exit(1)
        
    try:
        client = ApiClient(email, password)
        device = await client.p110(ip)
        
        device_info = await device.get_device_info()
        current_state = device_info.device_on
        print(f"Current Power State: {'ON' if current_state else 'OFF'}")
        
        target_state = not current_state
        print(f"Toggling power to: {'ON' if target_state else 'OFF'}...")
        if target_state:
            await device.on()
        else:
            await device.off()
        print("Successfully toggled Tapo plug!")
    except Exception as e:
        print(f"Tapo connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
