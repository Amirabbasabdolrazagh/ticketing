#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Fail-closed authorization of browser-originated calls via signed HTTPS."""
from __future__ import print_function
import hashlib
import hmac
import io
import json
import os
import sys
import time
try:
    from urllib.request import Request, urlopen
except ImportError:
    from urllib2 import Request, urlopen

CONFIG_PATH = "/etc/asterisk/itrasam-router.conf"
PY3 = sys.version_info[0] >= 3

def emit(value):
    line = 'SET VARIABLE ITRASAM_AUTHORIZED "%s"\n' % value
    sys.stdout.write(line)
    sys.stdout.flush()
    sys.stdin.readline()

def set_variable(key, value):
    value = str(value or "").replace('"', '').replace("\r", "").replace("\n", "")
    sys.stdout.write('SET VARIABLE %s "%s"\n' % (key, value))
    sys.stdout.flush()
    sys.stdin.readline()

def config():
    result = {}
    with io.open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.strip().split("=", 1)
                result[k] = v
    return result

agi = {}
while True:
    line = sys.stdin.readline()
    if not line or not line.strip():
        break
    key, _, value = line.strip().partition(":")
    agi[key] = value.strip()

try:
    cfg = config()
    secret = cfg["ITRASAM_ROUTER_SECRET"]
    url = cfg["ITRASAM_OUTBOUND_AUTH_URL"]
    timestamp = str(int(time.time()))
    raw = json.dumps({
        "token": agi.get("agi_arg_1", ""),
        "sipUsername": agi.get("agi_callerid", ""),
        "requestedNumber": agi.get("agi_extension", ""),
    }, separators=(",", ":")).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), timestamp.encode("ascii") + b"." + raw, hashlib.sha256).hexdigest()
    request = Request(url, data=raw, headers={
        "Content-Type": "application/json",
        "x-phone-timestamp": timestamp,
        "x-phone-signature": sig,
    })
    response = urlopen(request, timeout=4)
    try:
        data = json.loads(response.read().decode("utf-8"))
    finally:
        response.close()
    if data.get("authorized") is True:
        number = str(data.get("dialNumber", ""))
        call_id = str(data.get("callId", ""))
        if number.isdigit() and 2 <= len(number) <= 24 and len(call_id) == 36:
            set_variable("ITRASAM_DIAL_NUMBER", number)
            set_variable("ITRASAM_CALL_ID", call_id)
            set_variable("ITRASAM_RECORDING_ENABLED", "1" if data.get("recordingEnabled") else "0")
            emit("1")
        else:
            emit("0")
    else:
        emit("0")
except Exception as error:
    sys.stderr.write("ITRASAM outbound authorization failed: %s\n" % error.__class__.__name__)
    emit("0")
