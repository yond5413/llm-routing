
import { openRouter } from './openrouter';

export const TASK_CATEGORIES = [
  'Code Generation',
  'Text Summarization',
  'Question Answering',
  'Creative Writing',
  'Other',
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];

const CLASSIFICATION_MODEL = 'mistralai/mistral-7b-instruct:free';

const systemPrompt = `You are a task classification engine. Your job is to classify a user's prompt into one of the following predefined categories:

- Code Generation
- Text Summarization
- Question Answering
- Creative Writing
- Other

Please respond with ONLY the category name and nothing else.`;

export async function classifyPrompt(prompt: string): Promise<TaskCategory> {
  try {
    const { choice } = await openRouter.chatCompletion({
      model: CLASSIFICATION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    // Find the category that is included in the response.
    const foundCategory = TASK_CATEGORIES.find(category => choice.includes(category));

    if (foundCategory) {
      return foundCategory;
    }

    console.warn(`Classification failed for prompt. Could not find a valid category in response: "${choice}". Falling back to "Other".`);
    return 'Other';
  } catch (error) {
    console.error('Error during prompt classification:', error);
    return 'Other'; // Fallback to 'Other' in case of any API error
  }
}
