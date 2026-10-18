import time
import json
import random
import sys

def run_hardware_hub_simulation():
    """
    Simulates a localized edge hardware deployment tracking items dropped into the bay.
    """
    hardware_node_id = "HUB_BHOPAL_001"
    target_classes = ["printed_circuit_board", "lithium_ion_battery", "copper_cable"]
    
    print("=====================================================================")
    print(f"📡 ECOEXTRACT AI EDGE DAEMON ONLINE — INITIALIZING NODE: {hardware_node_id}")
    print("🎥 OpenCV Local Video Frame Core Extraction Pipeline Engaged...")
    print("=====================================================================\n")
    
    try:
        while True:
            # Sleep step simulates arrival cycle timing gap delays
            time.sleep(5) 
            
            simulated_match = random.choice(target_classes)
            simulated_confidence = round(random.uniform(0.91, 0.99), 2)
            simulated_mass = random.randint(80, 1400)
            
            # Construct strict telemetry package matching the production PRD layout
            data_telemetry_packet = {
                "node_hardware_id": hardware_node_id,
                "runtime_timestamp": "2026-10-19T00:58:00Z",
                "inference_data": {
                    "target_match": simulated_match,
                    "confidence_score": simulated_confidence,
                    "mass_grams": simulated_mass
                }
            }
            
            print(f"📦 [AI CAMERA INFERENCE MATCH] Category detected: {simulated_match.upper()}")
            print(f"📊 Confidence: {simulated_confidence * 100}% | Mass Weight: {simulated_mass} grams")
            print(f"🔒 [GPIO TRIGGER] Activating servo motor lock sweep configuration on: {simulated_match}_bin")
            print(f"📤 Telemetry payload generated:\n{json.dumps(data_telemetry_packet, indent=2)}")
            print("-" * 65)
            
    except KeyboardInterrupt:
        print("\n🛑 [EDGE INTERRUPT] AI sensor processing telemetry engine shut down cleanly.")
        sys.exit(0)

if __name__ == "__main__":
    run_hardware_hub_simulation()
