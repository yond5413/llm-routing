
import { NextResponse } from 'next/server';
import { classifyPrompt } from '@/lib/classification';
import { z } from 'zod';

const requestBodySchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = requestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsedBody.error.flatten() }, { status: 400 });
    }

    const { prompt } = parsedBody.data;
    const category = await classifyPrompt(prompt);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error in /api/classify:', error);
    // Check if the error is from JSON parsing
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
