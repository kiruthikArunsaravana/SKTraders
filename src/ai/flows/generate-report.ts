'use server';

/**
 * @fileOverview Generates a report on sales, expenses, and profits between two date ranges based on a natural language description.
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
      'A natural language description of the report to generate, including the date ranges, and what aspects of sales, expenses, and profits to include.'
    ),
  fromDate1: z.string().describe('The start date for the first date range (yyyy-MM-dd).'),
  toDate1: z.string().describe('The end date for the first date range (yyyy-MM-dd).'),
  fromDate2: z.string().describe('The start date for the second date range (yyyy-MM-dd).'),
  toDate2: z.string().describe('The end date for the second date range (yyyy-MM-dd).'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  report: z.string().describe('The generated report.'),
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

You are provided with a description of a report to generate, as well as two date ranges to consider.

Based on the description, create a report that compares sales, expenses, and profits between the two date ranges.

Date Range 1: From {{fromDate1}} to {{toDate1}}
Date Range 2: From {{fromDate2}} to {{toDate2}}

Report Description: {{reportDescription}}`,
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
