declare const APP_NAME: string;
declare const APP_VERSION: string;

export function configVersionCheck() {
    const appVersionKey = 'app-version-' + APP_NAME;
    const storedVersion = localStorage.getItem(appVersionKey);
    if (storedVersion == null) {
        console.info(`#configVersionCheck - storedVersion=${storedVersion} is null`);
        localStorage.setItem(appVersionKey, APP_VERSION);
    } else if (storedVersion !== APP_VERSION) {
        console.info(`#configVersionCheck - storedVersion=${storedVersion} does not match appVersion=${APP_VERSION}`);
        Object.keys(localStorage).forEach(key => {
            if (key.includes(APP_NAME)) {
                localStorage.removeItem(key);
            }
        });
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes(APP_NAME)) {
                sessionStorage.removeItem(key);
            }
        });
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
        localStorage.setItem(appVersionKey, APP_VERSION);
        window.location.reload();
    }
}