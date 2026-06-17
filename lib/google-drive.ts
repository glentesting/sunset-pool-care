/**
 * Google Drive — service account API. Uploads the assessment PDF to a fixed
 * folder, named by customer + date.
 *
 * Needs: service account JSON (env) + target folder ID (env). Get folder from Brent.
 */
import "server-only";

const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const FOLDER_ID = process.env.GDRIVE_ASSESSMENT_FOLDER_ID;

export async function uploadAssessmentPdf(
  _pdf: Buffer,
  _filename: string
): Promise<{ fileId: string; webViewLink: string }> {
  // TODO: auth via service account, upload to FOLDER_ID
  throw new Error("google-drive.uploadAssessmentPdf not implemented yet");
}

void SA_JSON;
void FOLDER_ID;
