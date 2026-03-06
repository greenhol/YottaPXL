export function configVersionCheck(appVersion: string) {
    const appVersionKey = 'app-version';
    const storedVersion = localStorage.getItem(appVersionKey);
    if (storedVersion !== appVersion) {
        console.info(`#configVersionCheck - storedVersion=${storedVersion} does not match appVersion=${appVersion}`);
        localStorage.clear();
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
        localStorage.setItem(appVersionKey, appVersion);
        window.location.reload();
    }
}