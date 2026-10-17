#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Upload a finished MixMonitor file to the private signed recording endpoint."""
from __future__ import print_function

import hashlib
import hmac
import io
import os
import re
import subprocess
import sys
import time

CONFIG_PATH = "/etc/asterisk/itrasam-router.conf"
RECORDING_DIR = "/var/spool/asterisk/monitor"


def config_value(name):
    with io.open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip()
    return ""


def main():
    if len(sys.argv) != 3:
        return 2
    call_id, filename = sys.argv[1:]
    if not re.match(r"^[A-Za-z0-9_-]{8,100}$", call_id):
        return 2
    resolved = os.path.realpath(filename)
    if not resolved.startswith(RECORDING_DIR + os.sep) or not os.path.isfile(resolved):
        return 2
    if os.path.getsize(resolved) < 1 or os.path.getsize(resolved) > 250 * 1024 * 1024:
        return 2
    secret = config_value("ITRASAM_RECORDING_SECRET")
    url = config_value("ITRASAM_RECORDING_URL") or "https://phone.itrasam.com/api/phone/recordings"
    if len(secret) < 32 or not url.startswith("https://phone.itrasam.com/"):
        return 2
    digest = hashlib.sha256()
    with open(resolved, "rb") as recording:
        while True:
            chunk = recording.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    timestamp = str(int(time.time()))
    message = "{}.{}.{}".format(timestamp, call_id, digest.hexdigest()).encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    command = [
        "curl", "--fail", "--silent", "--show-error", "--connect-timeout", "8", "--max-time", "240",
        "--request", "POST", "--header", "content-type: audio/wav",
        "--header", "x-phone-call-id: " + call_id,
        "--header", "x-phone-timestamp: " + timestamp,
        "--header", "x-phone-signature: " + signature,
        "--data-binary", "@" + resolved, url,
    ]
    for attempt in range(3):
        if subprocess.call(command) == 0:
            return 0
        if attempt < 2:
            time.sleep(3)
    return 1


if __name__ == "__main__":
    sys.exit(main())
