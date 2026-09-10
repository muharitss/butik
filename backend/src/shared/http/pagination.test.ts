import test from "node:test";
import assert from "node:assert/strict";
import { parsePagination, buildPaginationMeta, paginationSchema } from "./pagination.js";

test("parsePagination applies defaults when query is empty", () => {
  const result = parsePagination({});
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
  assert.equal(result.skip, 0);
  assert.equal(result.take, 20);
});

test("parsePagination parses valid string/number inputs and calculates skip/take", () => {
  const result = parsePagination({ page: "3", pageSize: "15" });
  assert.equal(result.page, 3);
  assert.equal(result.pageSize, 15);
  assert.equal(result.skip, 30);
  assert.equal(result.take, 15);
});

test("parsePagination caps pageSize to maxPageSize", () => {
  const result = parsePagination({ page: 1, pageSize: 250 });
  assert.equal(result.pageSize, 100);
  assert.equal(result.take, 100);

  const customMax = parsePagination({ page: 1, pageSize: 50 }, { maxPageSize: 25 });
  assert.equal(customMax.pageSize, 25);
});

test("parsePagination falls back to defaults on negative or invalid numbers", () => {
  const result = parsePagination({ page: "-5", pageSize: "invalid" });
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
});

test("buildPaginationMeta constructs payload matching API.md", () => {
  const meta = buildPaginationMeta(47, 2, 20);
  assert.deepEqual(meta, {
    page: 2,
    pageSize: 20,
    total: 47
  });
});

test("paginationSchema validates and coerces values via Zod", () => {
  const parsed = paginationSchema.parse({ page: "2", pageSize: "50" });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);

  const defaulted = paginationSchema.parse({});
  assert.equal(defaulted.page, 1);
  assert.equal(defaulted.pageSize, 20);

  assert.throws(() => paginationSchema.parse({ pageSize: 150 }));
});
