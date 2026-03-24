class Unique {
    private list: Set<string>
    private partSize: number;
    private parts: number;
    private static readonly CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
    private static readonly VOWELS = 'AEIOU';

    constructor(partSize: number, parts: number) {
        this.list = new Set<string>()
        this.partSize = partSize;
        this.parts = parts;
    }

    public newId(prefix: string): string {
        let candidate = this.createCandidate(prefix);
        let cnt = 0;
        while (this.exists(candidate)) {
            console.warn(`Candidate ${candidate} already exists. Retry.`);
            candidate = this.createCandidate(prefix);
            cnt++;
            if (cnt > 10) {
                console.error('Could not create a unique id, returning empty string', this.list);
                return '';
            }
        }
        this.list.add(candidate);
        // console.log(`returning newId ${candidate}`)
        return candidate;
    }

    private generateSyllable(): string {
        return (
            Unique.CONSONANTS[Math.floor(Math.random() * Unique.CONSONANTS.length)] +
            Unique.VOWELS[Math.floor(Math.random() * Unique.VOWELS.length)]
        );
    }

    private createCandidate(idCandidate: string): string {
        for (let i = 0; i < this.parts; i++) {
            idCandidate += `_${this.createPart()}`;
        }
        return idCandidate;
    }

    private createPart(): string {
        return [...Array(this.partSize).keys()]
            .map(() => this.generateSyllable())
            .join('');
    }

    private exists(id: string): boolean {
        return this.list.has(id);
    }
}

export const idGenerator = new Unique(2, 2);
