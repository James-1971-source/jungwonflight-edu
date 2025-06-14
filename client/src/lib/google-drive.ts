export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  webViewLink?: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private apiKey: string;

  constructor() {
    this.apiKey = (import.meta as any).env?.VITE_GOOGLE_DRIVE_API_KEY || "";
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async listFiles(folderId?: string): Promise<GoogleDriveFile[]> {
    if (!this.apiKey) {
      throw new Error("Google Drive API 키가 설정되지 않았습니다.");
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        fields: "files(id,name,mimeType,size,thumbnailLink,webViewLink)",
        q: folderId ? `'${folderId}' in parents` : "mimeType contains 'video'"
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
      
      if (!response.ok) {
        throw new Error(`Google Drive API 오류: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Google Drive 파일 목록 조회 오류:", error);
      throw new Error("Google Drive 파일을 불러올 수 없습니다.");
    }
  }

  getStreamingUrl(fileId: string): string {
    // Use direct streaming URL that works with video tag
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  getDirectUrl(fileId: string): string {
    if (!this.apiKey) {
      return `https://drive.google.com/file/d/${fileId}/view`;
    }
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.apiKey}`;
  }

  getThumbnailUrl(fileId: string, size: number = 400): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
  }

  // Get a fallback player URL for when iframe doesn't work
  getPlayerUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  // Alternative embed URL with autoplay disabled
  getEmbedUrl(fileId: string, autoplay: boolean = false): string {
    // Use the most reliable embed format for iframe
    return `https://drive.google.com/file/d/${fileId}/preview?usp=sharing&controls=1`;
  }
  
  // Get a more reliable embed URL using the uc endpoint
  getUcEmbedUrl(fileId: string): string {
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
