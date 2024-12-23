import { expect, test } from "vitest";
import { tempID } from "wx-lib-state";
import { RestURL } from "../src/index";

test("constructor", () => {
	const r = new RestURL("dummy");
	expect(r).toBeTruthy();
});

test("urls", async () => {
	const r = new RestURL("dummy");

	const res = [];
	r.fetch = (url, method) => res.push([url, method]);

	r.getAll();
	r.get("1");
	r.add({ x: 1 });
	r.update("1", { x: 2 });
	r.delete("1");

	expect(res).to.deep.eq([
		["dummy", "GET"],
		["dummy/1", "GET"],
		["dummy", "POST"],
		["dummy/1", "PUT"],
		["dummy/1", "DELETE"],
	]);
});

test("temp ID", () => {
	const r = new RestURL("dummy");
	const id = tempID();
	const escapedID = encodeURIComponent(id);

	const res = [];
	r.fetch = (url, method) => res.push([url, method]);

	r.get(id);
	r.add({ id, x: 1 });
	r.update(id, { x: 2 });
	r.delete(id);

	expect(res).to.deep.eq([
		["dummy/" + escapedID, "GET"],
		["dummy", "POST"],
	]);
});

test("headers", () => {
	const r = new RestURL("dummy", {
		headers: { "X-Test": "test" },
	});

	const res = [];
	r.fetch = (url, method, headers) => res.push(Object.keys(headers).join(","));

	r.getAll();
	r.get("1");
	r.add({ x: 1 });
	r.update("1", { x: 2 });
	r.delete("1");

	expect(res).to.deep.eq([
		"X-Test",
		"X-Test",
		"Content-Type,X-Test",
		"Content-Type,X-Test",
		"X-Test",
	]);
});
