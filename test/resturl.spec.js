import { expect, test } from "vitest";
import { tempID } from "wx-lib-state";
import { RestURL } from "../src/index";

function getMock(url, log) {
	url.fetch = (url, method, headers, body) =>
		log.push([url, method, headers, body]);
	return url;
}

test("constructor", () => {
	const r = new RestURL("dummy");
	expect(r).toBeTruthy();
});

test("urls", async () => {
	const res = [];
	const r = getMock(new RestURL("dummy"), res);

	r.fetch = (url, method) => res.push([url, method]);

	r.get();
	r.get("1");
	r.add({ x: 1 });
	r.update({ x: 2 }, "1");
	r.delete("1");

	expect(res.map(r => r.slice(0, 2))).to.deep.eq([
		["dummy", "GET"],
		["dummy/1", "GET"],
		["dummy", "POST"],
		["dummy/1", "PUT"],
		["dummy/1", "DELETE"],
	]);
});

test("temp ID", () => {
	const res = [];
	const r = getMock(new RestURL("dummy"), res);

	const id = tempID();
	const escapedID = encodeURIComponent(id);

	r.get(id);
	r.add({ id, x: 1 });
	r.update({ x: 2 }, id);
	r.delete(id);

	expect(res.map(r => r.slice(0, 2))).to.deep.eq([
		["dummy/" + escapedID, "GET"],
		["dummy", "POST"],
	]);
});

test("headers", () => {
	const res = [];
	const r = getMock(new RestURL("dummy", { "X-Test": "test" }), res);

	r.get();
	r.get("1");
	r.add({ x: 1 });
	r.update({ x: 2 }, "1");
	r.delete("1");

	expect(res.map(r => r[2])).to.deep.eq([
		{ "X-Test": "test" },
		{ "X-Test": "test" },
		{ "Content-Type": "application/json", "X-Test": "test" },
		{ "Content-Type": "application/json", "X-Test": "test" },
		{ "X-Test": "test" },
	]);
});

test("save method", () => {
	const res = [];
	const r = getMock(new RestURL("dummy"), res);

	// Test saving new record (no ID)
	r.save("add", { x: 1 });
	// Test saving existing record (with ID)
	r.save("update", { id: "123", x: 2 });
	r.save("update", { id: "123", x: 2 }, 123);
	r.save("update", { id: "123", x: 2 }, "/key/123");
	// Test deleting
	r.save("delete");
	r.save("delete", undefined, 123);
	r.save("delete", null, 123);

	expect(res).to.deep.eq([
		["dummy", "POST", { "Content-Type": "application/json" }, { x: 1 }],
		[
			"dummy",
			"PUT",
			{ "Content-Type": "application/json" },
			{ id: "123", x: 2 },
		],
		[
			"dummy/123",
			"PUT",
			{ "Content-Type": "application/json" },
			{ id: "123", x: 2 },
		],
		[
			"dummy/key/123",
			"PUT",
			{ "Content-Type": "application/json" },
			{ id: "123", x: 2 },
		],
		["dummy", "DELETE", {}, null],
		["dummy/123", "DELETE", {}, null],
		["dummy/123", "DELETE", {}, null],
	]);
});

test("path method", () => {
	const r = new RestURL("api");

	const log = [];
	const rApi = getMock(r.path("users"), log);

	rApi.get();
	rApi.add({ x: 1 });
	rApi.update({ x: 2 }, "1");
	rApi.delete("1");

	expect(log.map(r => r.slice(0, 2))).to.deep.eq([
		["api/users", "GET"],
		["api/users", "POST"],
		["api/users/1", "PUT"],
		["api/users/1", "DELETE"],
	]);
});

test("headers", () => {
	const res = [];
	const r = getMock(new RestURL("dummy"), res);

	const rApi = getMock(r.headers({ "X-Test": "test" }), res);
	rApi.get();
	rApi.get("1");
	rApi.add({ x: 1 });
	rApi.update({ x: 2 }, "1");
	rApi.delete("1");

	expect(res.map(r => r[2])).to.deep.eq([
		{ "X-Test": "test" },
		{ "X-Test": "test" },
		{ "Content-Type": "application/json", "X-Test": "test" },
		{ "Content-Type": "application/json", "X-Test": "test" },
		{ "X-Test": "test" },
	]);
});
