import * as DocumentPicker from 'expo-document-picker';

type UploadResult =
  | { success: true; file: DocumentPicker.DocumentPickerAsset; fileUrl?: string }
  | { success: false; error: string };

export async function handleAttachFileAndUpload(): Promise<UploadResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, error: "User cancelled file picking" };
    }

    const file = result.assets[0];

    if (!file) {
      return { success: false, error: "No file selected" };
    }

    // 🧠 Here you can later ADD uploading if you want.
    // For now, just return the picked file.
    return { success: true, file };
  } catch (error) {
    console.error("handleAttachFileAndUpload error:", error);
    return { success: false, error: (error as Error).message };
  }
}
