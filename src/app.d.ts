// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/** Build metadata injected by Vite at build time (see vite.config.ts). */
	const __TENANTKIT_BUILD__: {
		version: string;
		buildNumber: string;
		commit: string;
		date: string;
	};
}

export {};
