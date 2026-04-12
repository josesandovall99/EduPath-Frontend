/// <reference types="vite/client" />

declare module '*.css';
declare module '*.png';
declare module 'figma:asset/*' {
	const src: string;
	export default src;
}
