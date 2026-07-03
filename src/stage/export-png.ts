import { timer } from 'rxjs';

export interface ExportData {
    filename: string;
    title: string;
    creator: string;
    date: string;
    config: object;
}

export namespace ExportPng {

    const CRC_TABLE = buildCrcTable();
    const PNG_SIGNATURE_LENGTH = 8;

    export function exportPng(exportData: ExportData, canvas: HTMLCanvasElement) {
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const pngWithMetadata = await addMetadataToPng(blob, exportData);
            const url = URL.createObjectURL(pngWithMetadata);

            const imgLink = document.createElement('a');
            imgLink.download = `${exportData.filename}.png`;
            imgLink.href = url;
            imgLink.click();

            timer(100).subscribe(_ => {
                imgLink.remove();
                URL.revokeObjectURL(url);
            });
        }, 'image/png');
    }

    function buildCommentText(data: ExportData): string {
        return [
            `Title: ${data.title}`,
            `Software: ${data.creator}`,
            `Creation Time: ${data.date}`,
            `Config: ${JSON.stringify(data.config)}`,
        ].join('\n');
    }

    function escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function buildXmpPacket(data: ExportData): string {
        const title = escapeXml(data.title);
        const creator = escapeXml(data.creator);
        const date = escapeXml(data.date);
        const configJson = escapeXml(JSON.stringify(data.config));

        const lines = [
            `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
            `<x:xmpmeta xmlns:x="adobe:ns:meta/">`,
            `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
            `    <rdf:Description rdf:about=""`,
            `        xmlns:dc="http://purl.org/dc/elements/1.1/"`,
            `        xmlns:xmp="http://ns.adobe.com/xap/1.0/"`,
            `        xmlns:myapp="http://myapp.example.com/ns/1.0/">`,
            `      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>`,
            `      <xmp:CreatorTool>${creator}</xmp:CreatorTool>`,
            `      <xmp:CreateDate>${date}</xmp:CreateDate>`,
            `      <myapp:config>${configJson}</myapp:config>`,
            `    </rdf:Description>`,
            `  </rdf:RDF>`,
            `</x:xmpmeta>`,
            `<?xpacket end="w"?>`,
        ];
        return lines.join('\n');
    }

    function buildXmpChunk(data: ExportData): Uint8Array {
        return buildITXtChunk('XML:com.adobe.xmp', buildXmpPacket(data));
    }

    async function addMetadataToPng(blob: Blob, data: ExportData): Promise<Blob> {
        const buffer = await blob.arrayBuffer();
        const pngBytes = new Uint8Array(buffer);

        const chunks = [
            buildITXtChunk('Title', data.title),
            buildITXtChunk('Software', data.creator),
            buildITXtChunk('Creation Time', data.date),
            buildITXtChunk('Config', JSON.stringify(data.config)),
            buildITXtChunk('Comment', buildCommentText(data)),
            buildXmpChunk(data),
        ];

        const outputBytes = insertChunksAfterIHDR(pngBytes, chunks);
        return new Blob([outputBytes as Uint8Array<ArrayBuffer>], { type: 'image/png' });
    }

    function buildCrcTable(): Uint32Array {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c;
        }
        return table;
    }

    function crc32(bytes: Uint8Array): number {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function u32ToBytes(value: number): Uint8Array {
        return new Uint8Array([
            (value >>> 24) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 8) & 0xFF,
            value & 0xFF,
        ]);
    }

    function concatBytes(...arrays: Uint8Array[]): Uint8Array {
        const total = arrays.reduce((sum, a) => sum + a.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    function buildChunk(type: string, data: Uint8Array): Uint8Array {
        const typeBytes = new TextEncoder().encode(type); // always ASCII, 4 chars
        const length = u32ToBytes(data.length);
        const crcInput = concatBytes(typeBytes, data);
        const crc = u32ToBytes(crc32(crcInput));
        return concatBytes(length, typeBytes, data, crc);
    }

    /**
     * Builds an iTXt chunk.
     * Structure: keyword\0 + compressionFlag(1) + compressionMethod(1) + langTag\0 + translatedKeyword\0 + text
     * keyword must be Latin-1, 1-79 bytes. text is UTF-8, uncompressed here for simplicity.
     */
    function buildITXtChunk(keyword: string, text: string): Uint8Array {
        const encoder = new TextEncoder();
        const keywordBytes = encoder.encode(keyword); // keyword is ASCII in our case, safe as Latin-1
        const textBytes = encoder.encode(text);

        const data = concatBytes(
            keywordBytes,
            new Uint8Array([0]),       // null terminator after keyword
            new Uint8Array([0]),       // compression flag: 0 = uncompressed
            new Uint8Array([0]),       // compression method: 0 (irrelevant, uncompressed)
            new Uint8Array([0]),       // empty language tag + null terminator
            new Uint8Array([0]),       // empty translated keyword + null terminator
            textBytes,
        );

        return buildChunk('iTXt', data);
    }

    /**
     * Inserts the given chunks right after the IHDR chunk (the mandatory first chunk),
     * which is always at a fixed offset right after the 8-byte PNG signature.
     */
    function insertChunksAfterIHDR(pngBytes: Uint8Array, chunks: Uint8Array[]): Uint8Array {
        const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
        const ihdrLength = view.getUint32(PNG_SIGNATURE_LENGTH, false); // big-endian
        // 4 (length) + 4 (type) + ihdrLength (data) + 4 (crc)
        const ihdrEnd = PNG_SIGNATURE_LENGTH + 4 + 4 + ihdrLength + 4;

        const before = pngBytes.subarray(0, ihdrEnd);
        const after = pngBytes.subarray(ihdrEnd);

        return concatBytes(before, ...chunks, after);
    }
}
