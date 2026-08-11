/**
 * 依存ゼロの最小 ZIP アーカイバ(STORE = 無圧縮)。
 * mp3 / png のような圧縮済みファイルの詰め合わせ用途なので圧縮はしない。
 */

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

export function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

type Entry = {
	name: Uint8Array;
	data: Uint8Array;
	crc: number;
	offset: number;
};

export class ZipWriter {
	private chunks: Uint8Array[] = [];
	private entries: Entry[] = [];
	private offset = 0;

	/** ファイルを1つ追加(STORE)。 */
	add(name: string, data: Uint8Array): void {
		const nameBytes = new TextEncoder().encode(name);
		const crc = crc32(data);
		const header = new DataView(new ArrayBuffer(30));
		header.setUint32(0, 0x04034b50, true); // local file header signature
		header.setUint16(4, 20, true); // version needed
		header.setUint16(6, 0x0800, true); // flags: UTF-8 filename
		header.setUint16(8, 0, true); // method: store
		header.setUint16(10, 0, true); // mod time
		header.setUint16(12, 0, true); // mod date
		header.setUint32(14, crc, true);
		header.setUint32(18, data.length, true); // compressed size
		header.setUint32(22, data.length, true); // uncompressed size
		header.setUint16(26, nameBytes.length, true);
		header.setUint16(28, 0, true); // extra length

		this.entries.push({ name: nameBytes, data, crc, offset: this.offset });
		this.push(new Uint8Array(header.buffer));
		this.push(nameBytes);
		this.push(data);
	}

	/** ZIP 全体のバイト列を生成する。 */
	finish(): Uint8Array {
		const centralStart = this.offset;
		for (const e of this.entries) {
			const header = new DataView(new ArrayBuffer(46));
			header.setUint32(0, 0x02014b50, true); // central directory signature
			header.setUint16(4, 20, true); // version made by
			header.setUint16(6, 20, true); // version needed
			header.setUint16(8, 0x0800, true); // flags: UTF-8 filename
			header.setUint16(10, 0, true); // method: store
			header.setUint32(16, e.crc, true);
			header.setUint32(20, e.data.length, true);
			header.setUint32(24, e.data.length, true);
			header.setUint16(28, e.name.length, true);
			header.setUint32(42, e.offset, true); // local header offset
			this.push(new Uint8Array(header.buffer));
			this.push(e.name);
		}
		const centralSize = this.offset - centralStart;

		const end = new DataView(new ArrayBuffer(22));
		end.setUint32(0, 0x06054b50, true); // end of central directory signature
		end.setUint16(8, this.entries.length, true);
		end.setUint16(10, this.entries.length, true);
		end.setUint32(12, centralSize, true);
		end.setUint32(16, centralStart, true);
		this.push(new Uint8Array(end.buffer));

		const total = this.chunks.reduce((n, c) => n + c.length, 0);
		const out = new Uint8Array(total);
		let pos = 0;
		for (const c of this.chunks) {
			out.set(c, pos);
			pos += c.length;
		}
		return out;
	}

	get count(): number {
		return this.entries.length;
	}

	private push(chunk: Uint8Array): void {
		this.chunks.push(chunk);
		this.offset += chunk.length;
	}
}
