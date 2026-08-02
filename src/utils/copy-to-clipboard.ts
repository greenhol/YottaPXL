export async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('#copyToClipboard - Modern clipboard API failed:', err);
        }
    }

    // Fallback for mobile/older browsers
    return new Promise((resolve) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const success = document.execCommand('copy');
            resolve(success);
        } catch (err) {
            console.error('#copyToClipboard - Fallback copy failed:', err);
            resolve(false);
        } finally {
            document.body.removeChild(textarea);
        }
    });
}
