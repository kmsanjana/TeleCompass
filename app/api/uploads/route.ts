import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { queuePolicyProcessing } from "@/lib/ingest-runner";
import { extractStateName, getStateAbbreviation } from "@/lib/pdf-processor";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.ALLOW_UPLOAD !== "true") {
    return NextResponse.json({ error: "Uploads are disabled" }, { status: 403 });
  }

  if (process.env.ALLOW_INGEST !== "true") {
    return NextResponse.json({ error: "Ingestion is disabled" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type?.toLowerCase().includes("pdf")) {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "storage", "uploads");
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^\w. -]/g, "_");
    const fileName = `${randomUUID()}-${safeName}`;
    const filePath = path.join(uploadsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.writeFile(filePath, buffer);

    const stateNameRaw = extractStateName(file.name).trim();
    const stateName = stateNameRaw || "Unknown";

    let state = await prisma.state.findFirst({
      where: { name: { equals: stateName, mode: "insensitive" } },
    });

    if (!state) {
      const abbreviation = getStateAbbreviation(stateName);
      state = await prisma.state.create({
        data: {
          name: stateName,
          abbreviation,
        },
      });
    }

    const policy = await prisma.policy.create({
      data: {
        stateId: state.id,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        status: "processing",
      },
    });

    queuePolicyProcessing(policy.id, buffer, {
      filePath,
      deleteFileAfter: false,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded. Processing has started.",
      fileName,
      policyId: policy.id,
      stateName: state.name,
    });
  } catch (error) {
    console.error("Error handling upload:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
