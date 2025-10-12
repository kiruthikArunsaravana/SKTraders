'use server';

import { generateReport } from '@/ai/flows/generate-report';

export async function generateClientReport(
  contextString: string
): Promise<string> {
  try {
    const result = await generateReport(contextString);
    if (!result.report) {
      throw new Error('The AI could not generate a report with the provided data.');
    }
    return result.report;
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error(
      'An unexpected error occurred while generating the report. Please check the inputs and try again.'
    );
  }
}
