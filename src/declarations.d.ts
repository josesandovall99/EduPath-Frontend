/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string;
	// Agrega aquí otras variables VITE_ si las tienes
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
/// <reference types="vite/client" />

declare module '*.css';
declare module '*.png';
declare module 'figma:asset/*' {
	const src: string;
	export default src;
}
declare module 'figma:asset/*.png' {
	const src: string;
	export default src;
}
