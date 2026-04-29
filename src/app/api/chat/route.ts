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

    // Filter out any messages with empty content rather than hard-rejecting,
    // so a corrupted history from a previous failed request doesn't block recovery.
    const anthropicMessages = messages
      .filter(
        (msg: { role: string; content: string }) =>
          msg.content && typeof msg.content === "string" && msg.content.trim() !== ""
      )
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content.trim(),
      }));

    if (anthropicMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages to send" },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: anthropicMessages,
    });

    const text =
      response.content[0]?.type === "text" && response.content[0].text.trim()
        ? response.content[0].text
        : "(no response)";

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `API Error: ${message}` }, { status: 500 });
  }
}
