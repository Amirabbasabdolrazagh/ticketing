import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, validCategory, cleanText, cleanDate, detectType, validStorageKey } from "../lib/accountingValidation.mjs";

test("accounting categories only contain the four approved types", () => {
  assert.deepEqual(CATEGORIES, [
    "quarterly_transactions", "tax_vat", "purchase_invoice", "sales_invoice",
  ]);
  for (const value of CATEGORIES) assert.equal(validCategory(value), true);
  for (const value of ["admin", "agent", "", null, undefined, {}, ["tax_vat"]]) {
    assert.equal(validCategory(value), false);
  }
});

test("validates Gregorian ISO dates strictly including leap years", () => {
  assert.equal(cleanDate("2028-02-29")?.toISOString().slice(0, 10), "2028-02-29");
  for (const value of ["2027-02-29", "2026-13-01", "2026-11-31", "2026/01/01", "2026-1-01", "", null]) {
    assert.equal(cleanDate(value), null);
  }
});

test("rejects malformed and excessively long metadata", () => {
  assert.equal(cleanText("  invoice  ", 15, true), "invoice");
  assert.equal(cleanText("", 15, true), null);
  assert.equal(cleanText("123456", 5), null);
  assert.equal(cleanText("aa\0bb", 20), null);
  assert.equal(cleanText(1234, 20), null);
});

test("recognizes file signatures, not filenames or claimed mime types", () => {
  assert.equal(detectType(Buffer.from("%PDF-1.7\n", "ascii")), "pdf");
  assert.equal(detectType(Buffer.from([255, 216, 255, 224])), "jpg");
  assert.equal(detectType(Buffer.from("89504e470d0a1a0a", "hex")), "png");
  assert.equal(detectType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")])), "webp");
  assert.equal(detectType(Buffer.from("#!/bin/sh\n")), null);
  assert.equal(detectType(Buffer.from("<html><script></script></html>")), null);
  assert.equal(detectType(Buffer.alloc(0)), null);
  assert.equal(detectType("not a buffer"), null);
});

test("archive file keys cannot escape private storage", () => {
  assert.equal(validStorageKey("f".repeat(32) + ".pdf"), true);
  for (const key of ["../secrets.env", "/etc/passwd", "f".repeat(32) + ".svg", "F".repeat(32) + ".pdf", "f".repeat(31) + ".pdf", "", null]) {
    assert.equal(validStorageKey(key), false);
  }
});
