'use server';
/**
 * @fileOverview A finance report generation AI flow.
 *
 * - generateReport - A function that handles the finance report generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateReportOutput, GenerateReportOutputSchema } from './report-schemas';


export async function generateReport(
  contextString: string
): Promise<GenerateReportOutput> {
  return generateReportFlow(contextString);
}

const prompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: z.string() },
  output: { schema: GenerateReportOutputSchema },
  prompt: `
    You are a financial analyst for a company named SK Traders that deals in coconut husk products.
    Your task is to generate a concise and insightful financial report based on the provided data context.

    Here is the data context:
    ---
    {{{input}}}
    ---

    Analyze the provided data to fulfill the user's report request. 
    The report should be well-structured, easy to read, and directly address the user's query.
    Start with a summary of the key findings, and then provide supporting details and analysis.
    
    Do not just list the data. Provide insights and analysis.
    The final output should be a single block of text, formatted for readability in a plain text or markdown-style.
    Do not output JSON or any other format.
    `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: z.string(),
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
