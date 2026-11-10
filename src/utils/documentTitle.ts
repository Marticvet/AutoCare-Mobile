export const DOCUMENT_TITLE_MAX_LENGTH = 120;

/** Derives an editable title without changing the uploaded filesystem name. */
export function documentTitleFromFileName(fileName: string) {
    const lastDot = fileName.lastIndexOf(".");
    const withoutExtension = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
    return withoutExtension.trim().slice(0, DOCUMENT_TITLE_MAX_LENGTH);
}
