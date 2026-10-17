"""Conservative, rule-based Persian call report extraction; no generative model."""

import re

def _sentences(text):
    normalized = re.sub(r"[^\S\n]+", " ", text.replace("ي", "ی").replace("ك", "ک")).strip()
    return [part.strip(" ،؛:.-") for part in re.split(r"(?<=[.!؟؛])\s+|\n+", normalized) if part.strip()]


def _evidence(sentences, terms, limit=3):
    matched = [sentence for sentence in sentences if any(term in sentence for term in terms)]
    return "\n".join(matched[:limit])[:3000]


def extract_report(text):
    sentences = _sentences(text)
    issue = _evidence(sentences, ("مشکل", "خراب", "قطع", "ارور", "خطا", "کار نمی", "وصل نمی", "کند", "اختلال"))
    requests = _evidence(sentences, ("لطفا", "لطفاً", "می‌خوام", "میخوام", "می‌خواهم", "درخواست", "نیاز دار", "بررسی کنید"))
    actions = _evidence(sentences, ("بررسی کردم", "انجام دادم", "تنظیم کردم", "نصب کردم", "راه‌اندازی", "تست کردم", "ریست کردم", "ارسال کردم"))
    resolution = _evidence(sentences, ("حل شد", "درست شد", "برطرف شد", "هنوز حل نشد", "پیگیری می", "تماس می‌گیر", "پیگیری شود"))
    follow_up = _evidence(sentences, ("پیگیری", "بعدا", "بعداً", "فردا", "دوباره تماس", "ارجاع", "منتظر"))
    satisfaction = _evidence(sentences, ("راضی", "ممنون", "متشکر", "سپاس", "خوبه", "خوب شد"))

    outcome = "unknown"
    if re.search(r"(?:هنوز\s+)?(?:حل|درست|برطرف)\s+نشد(?:ه)?", text):
        outcome = "unresolved"
    elif re.search(r"(?:حل|درست|برطرف)\s+شد(?:ه)?", text):
        outcome = "resolved"
    elif follow_up:
        outcome = "follow_up"

    return {
        "summary": " ".join(sentences[:8])[:2500],
        "issue": issue,
        "customerRequests": requests,
        "agentActions": actions,
        "resolution": resolution,
        "outcome": outcome,
        "satisfactionEvidence": satisfaction,
        "followUp": follow_up,
        "model": "shenava-rule-based-v1",
    }
