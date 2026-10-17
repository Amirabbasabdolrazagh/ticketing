#!/usr/bin/env python3
"""Signed AGI lookup for routing a known customer to the owner of their active ticket."""
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.request

CONFIG_PATH = "/etc/asterisk/itrasam-router.conf"

def load_config():
    config = {}
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()
    except OSError:
        pass
    return config

agi = {}
for line in sys.stdin:
    line = line.strip()
    if not line:
        break
    key, _, value = line.partition(":")
    agi[key] = value.strip()

def set_var(name, value):
    safe = str(value or "").replace('"', "").replace("\r", " ").replace("\n", " ")
    print(f'SET VARIABLE {name} "{safe}"', flush=True)
    sys.stdin.readline()

try:
    config = load_config()
    secret = os.environ.get("ITRASAM_ROUTER_SECRET") or config["ITRASAM_ROUTER_SECRET"]
    url = os.environ.get("ITRASAM_ROUTER_URL") or config.get("ITRASAM_ROUTER_URL", "https://phone.itrasam.com/api/phone/inbound-route")
    timestamp = str(int(time.time()))
    raw = json.dumps({
        "callerNumber": agi.get("agi_callerid", ""),
        "did": agi.get("agi_dnid", ""),
        "callId": agi.get("agi_uniqueid", "").replace(".", "-"),
    }, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), (timestamp + ".").encode("utf-8") + raw, hashlib.sha256).hexdigest()
    request = urllib.request.Request(url, data=raw, headers={
        "Content-Type": "application/json", "x-phone-timestamp": timestamp, "x-phone-signature": signature,
    })
    with urllib.request.urlopen(request, timeout=4) as response:
        result = json.loads(response.read().decode("utf-8"))
    set_var("ITRASAM_ROUTE_STATUS", "matched" if result.get("matched") else "fallback")
    set_var("ITRASAM_EXTENSION", result.get("extension", "102"))
    web_endpoint = str(result.get("webEndpoint", ""))
    set_var("ITRASAM_WEB_ENDPOINT", web_endpoint if web_endpoint.replace("-", "").replace("_", "").replace(".", "").isalnum() else "")
    set_var("ITRASAM_CUSTOMER_NAME", result.get("customerName", "مشتری ای تی رسام"))
    set_var("ITRASAM_CALL_ID", result.get("callId", ""))
except Exception:
    set_var("ITRASAM_ROUTE_STATUS", "error")
    set_var("ITRASAM_EXTENSION", "")
    set_var("ITRASAM_WEB_ENDPOINT", "")
    set_var("ITRASAM_CUSTOMER_NAME", "مشتری ای تی رسام")
