const pageLanguage = "en";
const cookieName = "googtrans";
const containerId = "google_translate_element";
const initCallbackName = "__ravenStudioGoogleTranslateInit";

export interface StudioLanguage {
    code: string;
    name: string;
}

export const studioLanguages: StudioLanguage[] = [
    { code: "en", name: "English" },
    { code: "zh-CN", name: "中文 (Chinese)" },
    { code: "fr", name: "Français (French)" },
    { code: "de", name: "Deutsch (German)" },
    { code: "he", name: "עברית (Hebrew)" },
    { code: "hi", name: "हिन्दी (Hindi)" },
    { code: "ja", name: "日本語 (Japanese)" },
    { code: "pl", name: "Polski (Polish)" },
    { code: "pt", name: "Português (Portuguese)" },
    { code: "es", name: "Español (Spanish)" },
];

let loadPromise: Promise<void> = null;

export function getCurrentLanguage(): string {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=/[^/;]*/([^;]+)`));
    return match ? decodeURIComponent(match[1]) : pageLanguage;
}

export function restoreLanguageOnStartup(): void {
    if (getCurrentLanguage() !== pageLanguage) {
        // the widget auto-translates on init when the googtrans cookie is present
        ensureGoogleTranslateLoaded();
    }
}

export async function setLanguage(code: string): Promise<void> {
    if (code === getCurrentLanguage()) {
        return;
    }

    if (code === pageLanguage) {
        // the widget has no reliable programmatic "show original", a reload with a cleared cookie is the safe reset
        clearTranslationCookie();
        location.reload();
        return;
    }

    setTranslationCookie(code);

    const alreadyLoaded = !!loadPromise;
    await ensureGoogleTranslateLoaded();

    if (alreadyLoaded) {
        const combo = await waitForLanguageCombo();
        if (combo) {
            combo.value = code;
            combo.dispatchEvent(new Event("change"));
        } else {
            location.reload();
        }
    }
}

function setTranslationCookie(code: string) {
    document.cookie = `${cookieName}=/${pageLanguage}/${code}; path=/`;
}

function clearTranslationCookie() {
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${cookieName}=; path=/; domain=${location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function ensureGoogleTranslateLoaded(): Promise<void> {
    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = new Promise<void>((resolve) => {
        const container = document.createElement("div");
        container.id = containerId;
        container.style.display = "none";
        document.body.appendChild(container);

        (window as any)[initCallbackName] = () => {
            const googleTranslate = (window as any).google?.translate;
            if (!googleTranslate) {
                return;
            }

            new googleTranslate.TranslateElement(
                {
                    pageLanguage,
                    includedLanguages: studioLanguages
                        .map((x) => x.code)
                        .filter((x) => x !== pageLanguage)
                        .join(","),
                    autoDisplay: false,
                },
                containerId
            );
            resolve();
        };

        const script = document.createElement("script");
        script.src = `https://translate.google.com/translate_a/element.js?cb=${initCallbackName}`;
        script.async = true;
        document.head.appendChild(script);
    });

    return loadPromise;
}

function waitForLanguageCombo(timeoutMs = 5000): Promise<HTMLSelectElement> {
    return new Promise((resolve) => {
        const started = Date.now();

        const tryFind = () => {
            const combo = document.querySelector<HTMLSelectElement>(`#${containerId} select.goog-te-combo`);
            if (combo && combo.options.length > 0) {
                resolve(combo);
            } else if (Date.now() - started > timeoutMs) {
                resolve(null);
            } else {
                setTimeout(tryFind, 100);
            }
        };

        tryFind();
    });
}
