---
name: tapo-control
description: Local control and automation instructions for TP-Link Tapo smart plugs (e.g. P110M) and cameras via local networks (KLAP and RTSP).
---

# Tapo Smart Plug Control & Automation

This skill equips the agent with instructions and scripts to query, discover, and control TP-Link Tapo smart devices locally.

## Prerequisite Setup
1. **Python 3.10+**: Ensure Python is installed on the system.
2. **Library Dependency**: Install the Rust-compiled python client `tapo`:
   ```bash
   pip install tapo
   ```
3. **App Setting Toggle (Crucial)**: 
   * If local calls fail with `403 Forbidden`, open the Tapo app on your phone, go to **Me** -> **Third-Party Services** / **Compatibility** -> Toggle **Local Control** or **Third-Party Compatibility** OFF and then back ON to authorize third-party local integrations.

## Command Execution
Run the following script to toggle the smart plug power state:
```bash
python tapo_toggle.py <plug-ip-address>
```

### Python Implementation (`scripts/tapo_toggle.py`):
```python
import asyncio
import sys
from tapo import ApiClient

async def main():
    if len(sys.argv) < 2:
        print("Error: Please provide the Tapo device IP address as an argument.")
        sys.exit(1)
        
    ip = sys.argv[1]
    email = 'mckellpeh@gmail.com'
    password = 'Fc1548ready@'
    
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
```
