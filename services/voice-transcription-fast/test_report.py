import unittest

from report import extract_report


class ReportExtractionTests(unittest.TestCase):
    def test_explicit_evidence_fills_fields_without_guessing_satisfaction(self):
        result = extract_report(
            "مشکل اینترنت قطع است. لطفا بررسی کنید. تنظیم کردم و تست کردم. "
            "الان درست شد. ممنون."
        )
        self.assertIn("اینترنت قطع است", result["issue"])
        self.assertIn("لطفا بررسی کنید", result["customerRequests"])
        self.assertIn("تست کردم", result["agentActions"])
        self.assertEqual(result["outcome"], "resolved")
        self.assertEqual(result["model"], "shenava-rule-based-v1")

    def test_negated_resolution_is_not_misclassified(self):
        result = extract_report("مشکل هنوز حل نشد. باید فردا پیگیری شود.")
        self.assertEqual(result["outcome"], "unresolved")
        self.assertIn("فردا", result["followUp"])

    def test_unclear_transcript_stays_unknown(self):
        result = extract_report("سلام. روز بخیر.")
        self.assertEqual(result["outcome"], "unknown")
        self.assertEqual(result["issue"], "")
        self.assertEqual(result["satisfactionEvidence"], "")


if __name__ == "__main__":
    unittest.main()
