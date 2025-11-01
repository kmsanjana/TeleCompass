"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";

interface UploadResult {
  success: boolean;
  message: string;
  stateName?: string;
  policyId?: string;
  error?: string;
}

export default function ManualUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Select a PDF before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setProgress(10);
      setError("");
      setResult(null);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setProgress(100);
      setResult({ success: true, message: data.message, stateName: data.stateName, policyId: data.policyId });
      setFile(null);
    } catch (err) {
      setProgress(0);
      setResult(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Policy PDF
        </CardTitle>
        <CardDescription>
          Upload a telehealth policy PDF to process it immediately through the local ingestion pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="cursor-pointer"
          />
          <Button type="button" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {uploading && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {result?.success && (
          <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <div>
              <p>{result.message}</p>
              {result.stateName && <p>State detected: {result.stateName}</p>}
              {result.policyId && <p>Policy ID: {result.policyId}</p>}
              <p className="text-xs text-green-600">Processing continues in the background. Refresh the dashboard after a minute.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p>{error}</p>
              <p className="text-xs text-red-600">Ensure ALLOW_UPLOAD and ALLOW_INGEST are true, and the server & Ollama are running.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
