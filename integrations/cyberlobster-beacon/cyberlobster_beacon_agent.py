#!/usr/bin/env python3
"""
CyberLobsterRTC Beacon Integration
==================================
OpenClaw AI Agent registered on Beacon Atlas via RustChain relay.

Agent ID: bcn_1dc6bbaeaf79
Wallet: eB51DWp1uECrLZRLsE2cnyZUzfRWvzUzaJzkatTpQV9
Bounty: #422 - Register Your Agent on Beacon Atlas (5 RTC)
"""

import time
import json
import subprocess
import sys
from typing import Dict, Any, Optional


class CyberLobsterBeaconAgent:
    """
    CyberLobsterRTC Beacon v2 Integration Module.
    Implements agent registration, heartbeat, and discovery via Beacon protocol.
    """
    
    AGENT_ID = "bcn_1dc6bbaeaf79"
    WALLET = "eB51DWp1uECrLZRLsE2cnyZUzfRWvzUzaJzkatTpQV9"
    RELAY_TOKEN = "relay_82ba41651f5dc2bb1ffdbef68208b4eca72ed43a56941f22"
    PROFILE_URL = "https://rustchain.org/beacon/agent/bcn_1dc6bbaeaf79"
    
    def __init__(self):
        self.status = "initializing"
        print(f"🚀 Initializing CyberLobsterRTC Beacon Agent: {self.AGENT_ID}")
    
    def run_beacon_command(self, args: list) -> Dict[str, Any]:
        """Run a beacon CLI command and return parsed output."""
        cmd = ["beacon"] + args
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                env={**subprocess.os.environ, "BEACON_PASSWORD": "openclaw123"}
            )
            if result.returncode == 0:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    return {"raw": result.stdout.strip()}
            else:
                return {"error": result.stderr.strip()}
        except Exception as e:
            return {"error": str(e)}
    
    def show_identity(self) -> Dict[str, Any]:
        """Show current agent identity."""
        print("🔑 Showing agent identity...")
        result = self.run_beacon_command(["identity", "show", "--password", "openclaw123"])
        if "agent_id" in result:
            print(f"   Agent ID: {result['agent_id']}")
            print(f"   Public Key: {result['public_key_hex'][:32]}...")
        return result
    
    def send_heartbeat(self) -> Dict[str, Any]:
        """Send a heartbeat to the Beacon relay."""
        print("💓 Sending heartbeat to Beacon relay...")
        result = self.run_beacon_command([
            "relay", "heartbeat",
            "--agent-id", self.AGENT_ID,
            "--token", self.RELAY_TOKEN,
            "--status", "alive"
        ])
        if result.get("ok"):
            print(f"   ✅ Heartbeat accepted! Beat count: {result.get('beat_count', '?')}")
            print(f"   📊 Status: {result.get('status', 'unknown')}")
            print(f"   🔗 Profile: {result.get('seo', {}).get('profile_url', 'N/A')}")
        return result
    
    def list_agents(self) -> Dict[str, Any]:
        """List all registered agents on the relay."""
        print("🔍 Checking relay agent roster...")
        result = self.run_beacon_command(["relay", "list"])
        if "agents" in result:
            print(f"   Total agents: {result.get('count', 0)}")
            for agent in result.get("agents", []):
                print(f"   - {agent.get('name', 'unknown')}: {agent.get('agent_id', '?')} [{agent.get('status', '?')}]")
        return result
    
    def get_relay_stats(self) -> Dict[str, Any]:
        """Get relay statistics."""
        print("📊 Fetching relay statistics...")
        result = self.run_beacon_command(["relay", "stats"])
        if "total_agents" in result:
            print(f"   Active agents: {result.get('active', 0)}/{result.get('total_agents', 0)}")
            print(f"   By provider: {result.get('by_provider', {})}")
        return result
    
    def run_demo_cycle(self):
        """Run a complete demo cycle demonstrating Beacon integration."""
        print("\n" + "="*60)
        print("🤖 CyberLobsterRTC Beacon Integration Demo")
        print("="*60)
        
        self.show_identity()
        time.sleep(1)
        
        self.send_heartbeat()
        time.sleep(1)
        
        self.list_agents()
        time.sleep(1)
        
        self.get_relay_stats()
        
        print("\n" + "="*60)
        print("✨ Beacon Integration Demo Complete.")
        print(f"   Agent: {self.AGENT_ID}")
        print(f"   Wallet: {self.WALLET}")
        print(f"   Bounty: #422 - Register Your Agent on Beacon Atlas (5 RTC)")
        print("="*60 + "\n")


if __name__ == "__main__":
    agent = CyberLobsterBeaconAgent()
    agent.run_demo_cycle()
