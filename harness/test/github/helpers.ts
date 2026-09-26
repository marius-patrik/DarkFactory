export type Call = { url: string; init?: RequestInit };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(body === undefined ? undefined : JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

export function scripted(responses: Response[]) {
	const calls: Call[] = [];
	const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		calls.push({ url: String(input), init });
		const response = responses.shift();
		if (!response) throw new Error("unexpected request");
		return response;
	};
	return { fetch, calls };
}
