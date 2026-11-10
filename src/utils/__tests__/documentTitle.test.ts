import { DOCUMENT_TITLE_MAX_LENGTH, documentTitleFromFileName } from "../documentTitle";

describe("documentTitleFromFileName", () => {
    it("keeps the upload filename intact elsewhere while deriving a bounded title", () => {
        const fileName = `${"Vehicle-inspection-".repeat(20)}final.pdf`;
        const title = documentTitleFromFileName(fileName);

        expect(title).not.toContain(".pdf");
        expect(title.length).toBe(DOCUMENT_TITLE_MAX_LENGTH);
        expect(fileName.endsWith(".pdf")).toBe(true);
    });

    it("does not remove a dot when it is not a filename extension", () => {
        expect(documentTitleFromFileName(".well-known")).toBe(".well-known");
    });
});
