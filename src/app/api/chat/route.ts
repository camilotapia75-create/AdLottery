import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must be non-empty" },
        { status: 400 }
      );
    }

    // Guard: reject any message with empty or whitespace-only text
    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== "string" || msg.content.trim() === "") {
        return NextResponse.json(
          { error: "Message content must be non-empty" },
          { status: 400 }
        );
      }
    }

    const anthropicMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.trim(),
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: anthropicMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `API Error: ${message}` }, { status: 500 });
  }
}
