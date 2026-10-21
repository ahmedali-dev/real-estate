import test from "node:test";
import assert from "node:assert/strict";
import { literalSearch } from "../lib/search";
test("search escapes regex operators and bounds input length", () => {
  const text = "(a+)+$ .* [district]";
  const expression = new RegExp(literalSearch(text));
  assert.equal(expression.test(text), true);
  assert.equal(expression.test("aaaaaaa"), false);
  assert.equal(literalSearch("a".repeat(500)).length, 200);
  assert.equal(literalSearch(null), "");
});
