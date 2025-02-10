import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import RestDataProvider from "../src/RestDataProvider";

describe("RestDataProvider", () => {
	let provider: RestDataProvider<any>;
	const testUrl = "http://mockapi.com";
	const testBatchUrl = "/batch";

	beforeEach(() => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				json: () => Promise.resolve({}),
			})
		) as unknown as typeof fetch;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should send a single request when batch mode is not enabled", async () => {
		provider = new RestDataProvider(testUrl);
		await provider.send("/test", "POST", { data: "test" });

		expect(global.fetch).toHaveBeenCalledWith(
			`${testUrl}/test`,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ data: "test" }),
			})
		);
	});

	it("should send a single request if only one request is made in batch mode", async () => {
		provider = new RestDataProvider(testUrl, { batchURL: testBatchUrl });
		const promise = provider.send("/test", "POST", { data: "test" });

		await promise;

		expect(global.fetch).toHaveBeenCalledWith(
			`${testUrl}/test`,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ data: "test" }),
			})
		);
	});

	it("should batch multiple requests when batch mode is enabled and send calls in 10ms frame", async () => {
		provider = new RestDataProvider(testUrl, { batchURL: testBatchUrl });

		provider.send("/test1", "POST", { data: "test1" });
		await new Promise(resolve => setTimeout(resolve, 7));
		provider.send("/test2", "PUT", { data: "test2" });

		await new Promise(resolve => setTimeout(resolve, 10));

		expect(global.fetch).toHaveBeenCalledWith(
			testUrl + testBatchUrl,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify([
					{ url: "/test1", method: "POST", data: { data: "test1" } },
					{ url: "/test2", method: "PUT", data: { data: "test2" } },
				]),
			})
		);
	});

	it("should send separate requests when interval between calls is more than 10ms", async () => {
		provider = new RestDataProvider(testUrl, { batchURL: testBatchUrl });

		provider.send("/test1", "POST", { data: "test1" });
		await new Promise(resolve => setTimeout(resolve, 11));
		provider.send("/test2", "POST", { data: "test2" });

		await new Promise(resolve => setTimeout(resolve, 15));

		expect(global.fetch).toHaveBeenCalledTimes(2);

		expect(global.fetch).toHaveBeenNthCalledWith(
			1,
			testUrl + "/test1",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ data: "test1" }),
			})
		);

		expect(global.fetch).toHaveBeenNthCalledWith(
			2,
			testUrl + "/test2",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ data: "test2" }),
			})
		);
	});
});
