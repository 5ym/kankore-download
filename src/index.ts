import { ZipWriter } from './zip';

/**
 * 艦これのタイトルコール音声・タイトル画像を連番で取得し、
 * 404(欠番)が出たところで打ち切って ZIP にまとめる。
 * 元の Google Colab ノートブック(Python)の Bun + TypeScript 移植版。
 */

const BASE = process.env.KC_BASE_URL ?? 'http://125.6.189.7';

type Target = {
	/** 出力 ZIP 名 */
	zip: string;
	/** 連番を差し込む URL を作る */
	url: (n: string) => string;
	/** 連番のゼロ埋め桁数 */
	pad: number;
};

const TARGETS: Record<string, Target> = {
	title1: {
		zip: 'title1.zip',
		url: (n) => `${BASE}/kcs2/resources/voice/titlecall_1/${n}.mp3`,
		pad: 3
	},
	title2: {
		zip: 'title2.zip',
		url: (n) => `${BASE}/kcs2/resources/voice/titlecall_2/${n}.mp3`,
		pad: 3
	},
	titleimg: {
		zip: 'titleimg.zip',
		url: (n) => `${BASE}/kcs2/img/title/${n}.png`,
		pad: 2
	}
};

const MAX = 999;

async function downloadTarget(name: string, target: Target): Promise<void> {
	console.log(`==> ${name} (${target.zip})`);
	const zip = new ZipWriter();
	for (let i = 1; i <= MAX; i++) {
		const padded = String(i).padStart(target.pad, '0');
		const url = target.url(padded);
		const res = await fetch(url);
		if (!res.ok) {
			console.log('file get complete');
			break;
		}
		const data = new Uint8Array(await res.arrayBuffer());
		zip.add(url.split('/').at(-1) ?? padded, data);
		console.log(i);
	}
	if (zip.count === 0) {
		console.warn(`${name}: 1件も取得できませんでした(URL やネットワークをご確認ください)`);
		return;
	}
	await Bun.write(target.zip, zip.finish());
	console.log(`saved: ${target.zip} (${zip.count} files)`);
}

const args = process.argv.slice(2);
const names = args.length > 0 ? args : Object.keys(TARGETS);

for (const name of names) {
	const target = TARGETS[name];
	if (!target) {
		console.error(`unknown target: ${name}`);
		console.error(`available: ${Object.keys(TARGETS).join(', ')}`);
		process.exit(1);
	}
	await downloadTarget(name, target);
}
