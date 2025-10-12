'use server';

/**
 * @fileOverview Generates a report on sales, expenses, and profits based on a pre-formatted context string.
 *
 * - generateReport - A function that generates the report.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportInputSchema = z.object({
  reportDescription: z
    .string()
    .describe(
      'A natural language description of the report to generate, including what aspects of sales, expenses, and profits to include.'
    ),
  reportContext: z.string().describe('A pre-formatted string containing all the data and context for the report.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  report: z.string().describe('The generated report in plain text format.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: {schema: GenerateReportInputSchema},
  output: {schema: GenerateReportOutputSchema},
  prompt: `You are an expert business analyst.

You are provided with a description of a report to generate, as well as a context string containing all the relevant financial data.

Based on the description and the data, create a report that analyzes sales, expenses, and profits.

Report Context:
{{{reportContext}}}

Report Description: {{reportDescription}}

Generate a concise report based on the provided data and description. Analyze the data and provide insights. The report should be in plain text format.
`,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    const {output} = await generateReportPrompt(input);
    return output!;
  }
);
