import {NextRequest, NextResponse} from "next/server";
import {handlePdfUpload} from "@/scripts/loadDB"

export async function POST(req: NextRequest){
  try{
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if(!file|| file.type !=="application/pdf"){
      return NextResponse.json({error:"Invalid file format"},{status:400});
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await handlePdfUpload(buffer);
    return NextResponse.json({ message: "PDF processed and embeddings stored!" })

  }
  catch(error){
    console.error("upload error:", error);
    return NextResponse.json({ error: "Something went wrong while processing the PDF." }, { status: 500 });

  }
}