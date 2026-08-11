import { describe, expect, test } from 'bun:test';
import { crc32, ZipWriter } from './zip';

describe('crc32', () => {
	test('known vectors', () => {
		const enc = (s: string) => new TextEncoder().encode(s);
		expect(crc32(enc('123456789'))).toBe(0xcbf43926);
		expect(crc32(enc(''))).toBe(0);
		expect(crc32(enc('a'))).toBe(0xe8b7be43);
	});
});

describe('ZipWriter', () => {
	test('produces a structurally valid archive', () => {
		const zip = new ZipWriter();
		const body = new TextEncoder().encode('hello zip');
		zip.add('001.mp3', body);
		zip.add('002.mp3', body);
		const out = zip.finish();
		const view = new DataView(out.buffer, out.byteOffset, out.byteLength);

		// local file header signature at offset 0
		expect(view.getUint32(0, true)).toBe(0x04034b50);
		// end of central directory: last 22 bytes
		const eocd = out.length - 22;
		expect(view.getUint32(eocd, true)).toBe(0x06054b50);
		// entry count
		expect(view.getUint16(eocd + 10, true)).toBe(2);
		// central directory offset points at a central header
		const cdOffset = view.getUint32(eocd + 16, true);
		expect(view.getUint32(cdOffset, true)).toBe(0x02014b50);
		// stored sizes match the body
		expect(view.getUint32(18, true)).toBe(body.length);
	});

	test('round-trips through system unzip when available', async () => {
		const which = Bun.spawnSync(['which', 'unzip']);
		if (which.exitCode !== 0) return; // unzip 不在の環境ではスキップ

		const zip = new ZipWriter();
		zip.add('a.txt', new TextEncoder().encode('alpha'));
		zip.add('b.txt', new TextEncoder().encode('beta'));
		const path = `/tmp/kankore-ziptest-${process.pid}.zip`;
		await Bun.write(path, zip.finish());
		const result = Bun.spawnSync(['unzip', '-t', path]);
		const stdout = result.stdout.toString();
		expect(result.exitCode).toBe(0);
		expect(stdout).toContain('a.txt');
		expect(stdout).toContain('b.txt');
	});
});
